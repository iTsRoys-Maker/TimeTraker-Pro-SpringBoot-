import { useMemo, useState } from "react";
import { create, all, MathNode } from "mathjs";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Sigma, Zap } from "lucide-react";

const math = create(all, {});

const COULOMB_K = 9e9;

function ProcedureAccordion({ children }: { children: React.ReactNode }) {
  return (
    <details className="group academic-accordion border border-border/70 rounded-lg bg-background/40 overflow-hidden transition-colors hover:border-primary/40">
      <summary className="cursor-pointer select-none list-none px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-foreground/90 hover:bg-primary/5 transition-colors">
        <span className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-primary transition-transform duration-300 ease-in-out group-open:rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Ver procedimiento detallado
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 group-open:opacity-0 transition-opacity">
          Paso a paso
        </span>
      </summary>
      <div className="academic-accordion-content px-4 pb-4 pt-2 space-y-2 border-t border-border/50">{children}</div>
    </details>
  );
}

function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "html" });
    } catch {
      return tex;
    }
  }, [tex, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function nodeToTex(n: MathNode): string {
  try {
    return n.toTex({ parenthesis: "auto", implicit: "hide" });
  } catch {
    return n.toString();
  }
}

function evalAt(node: MathNode, x: number): number | null {
  try {
    const v = node.evaluate({ x });
    if (typeof v === "number" && isFinite(v)) return v;
    if (v && typeof v.re === "number" && typeof v.im === "number" && v.im === 0 && isFinite(v.re)) return v.re;
    return null;
  } catch {
    return null;
  }
}

type Step = { title: string; tex?: string; note?: string };

type LimitResult = {
  steps: Step[];
  resultTex: string;
  resultValue: number | null;
};

function isFraction(node: MathNode): boolean {
  return node.type === "OperatorNode" && (node as any).op === "/";
}

function hasSqrt(node: MathNode): boolean {
  let found = false;
  node.traverse((child) => {
    if (child.type === "FunctionNode" && (child as any).fn?.name === "sqrt") found = true;
    if (child.type === "OperatorNode" && (child as any).op === "^") {
      const args = (child as any).args;
      if (args?.[1]?.type === "ConstantNode" && args[1].value === 0.5) found = true;
    }
  });
  return found;
}

function makeConjugate(side: MathNode): MathNode | null {
  // If side = A ± B, return A ∓ B
  if (side.type === "OperatorNode") {
    const op = (side as any).op;
    if (op === "+" || op === "-") {
      const args = (side as any).args;
      if (args.length === 2) {
        const newOp = op === "+" ? "-" : "+";
        return new (math as any).OperatorNode(newOp, newOp === "+" ? "add" : "subtract", [args[0], args[1]]);
      }
    }
  }
  return null;
}

function safeSimplify(node: MathNode): MathNode {
  try {
    return math.simplify(node);
  } catch {
    return node;
  }
}

// Extract polynomial coefficients in ascending order [c0, c1, c2, ...]
// using Taylor expansion at 0. Returns null if expression is not a polynomial in x.
function polyCoeffs(node: MathNode, maxDeg = 8): number[] | null {
  const coeffs: number[] = [];
  let current: MathNode = node;
  let factorial = 1;
  for (let i = 0; i <= maxDeg; i++) {
    if (i > 0) {
      try {
        current = math.derivative(current, "x");
      } catch {
        return null;
      }
    }
    let v: any;
    try {
      v = current.evaluate({ x: 0 });
    } catch {
      return null;
    }
    if (typeof v !== "number" || !isFinite(v)) return null;
    coeffs.push(v / factorial);
    factorial *= i + 1;
  }
  // Verify polynomial: one more derivative should evaluate to ~0 across several points
  try {
    const extra = math.derivative(current, "x");
    for (const test of [-2, -1, 0, 1, 2]) {
      const ev = extra.evaluate({ x: test });
      if (typeof ev !== "number" || Math.abs(ev) > 1e-6) return null;
    }
  } catch {
    return null;
  }
  // Trim trailing zeros
  while (coeffs.length > 1 && Math.abs(coeffs[coeffs.length - 1]) < 1e-9) coeffs.pop();
  return coeffs;
}

// Synthetic division of polynomial (ascending coeffs) by (x - a)
function syntheticDivide(coeffs: number[], a: number): { quotient: number[]; remainder: number } {
  const desc = [...coeffs].reverse();
  const out: number[] = [desc[0]];
  for (let i = 1; i < desc.length; i++) {
    out.push(desc[i] + a * out[i - 1]);
  }
  const remainder = out.pop()!;
  return { quotient: out.reverse(), remainder };
}

function coeffsToNode(coeffs: number[]): MathNode {
  const cleaned = [...coeffs];
  while (cleaned.length > 1 && Math.abs(cleaned[cleaned.length - 1]) < 1e-9) cleaned.pop();
  const terms: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (Math.abs(c) < 1e-9) continue;
    const cRound = Math.abs(c - Math.round(c)) < 1e-9 ? Math.round(c) : Number(c.toFixed(6));
    if (i === 0) terms.push(`${cRound}`);
    else if (i === 1) terms.push(`${cRound}*x`);
    else terms.push(`${cRound}*x^${i}`);
  }
  const expr = terms.length ? terms.join(" + ").replace(/\+ -/g, "- ") : "0";
  return math.parse(expr);
}

// Attempt to factor (x - a) from numerator and denominator simultaneously.
// Returns simplified num/den nodes after canceling all common (x - a) factors.
function factorOutRoot(
  num: MathNode,
  den: MathNode,
  a: number
): { num: MathNode; den: MathNode; canceled: number } | null {
  let nc = polyCoeffs(num);
  let dc = polyCoeffs(den);
  if (!nc || !dc) return null;
  let canceled = 0;
  while (true) {
    const nv = nc.reduce((s, c, i) => s + c * Math.pow(a, i), 0);
    const dv = dc.reduce((s, c, i) => s + c * Math.pow(a, i), 0);
    if (Math.abs(nv) > 1e-7 || Math.abs(dv) > 1e-7) break;
    if (nc.length <= 1 || dc.length <= 1) break;
    const nDiv = syntheticDivide(nc, a);
    const dDiv = syntheticDivide(dc, a);
    if (Math.abs(nDiv.remainder) > 1e-6 || Math.abs(dDiv.remainder) > 1e-6) break;
    nc = nDiv.quotient;
    dc = dDiv.quotient;
    canceled++;
  }
  if (canceled === 0) return null;
  return { num: coeffsToNode(nc), den: coeffsToNode(dc), canceled };
}

function computeLimit(exprStr: string, target: string): LimitResult {
  const steps: Step[] = [];
  const node = math.parse(exprStr);
  const a = math.parse(target);
  const aVal = evalAt(a, 0);

  const exprTex = nodeToTex(node);
  const targetTex = nodeToTex(a);

  // Step 1: direct substitution
  const substituted = node.transform((n) => {
    if (n.type === "SymbolNode" && (n as any).name === "x") return a.cloneDeep();
    return n;
  });
  const substitutedTex = nodeToTex(substituted);
  const directVal = aVal !== null ? evalAt(node, aVal) : null;

  steps.push({
    title: "Paso 1 — Sustitución directa",
    tex: `\\lim_{x \\to ${targetTex}} ${exprTex} = ${substitutedTex}`,
    note: "Sustituimos x por el valor al que tiende.",
  });

  // Check for indeterminacy if it's a fraction
  let indeterminate = false;
  if (isFraction(node) && aVal !== null) {
    const args = (node as any).args as MathNode[];
    const numV = evalAt(args[0], aVal);
    const denV = evalAt(args[1], aVal);
    if (numV !== null && denV !== null) {
      if (Math.abs(numV) < 1e-12 && Math.abs(denV) < 1e-12) {
        indeterminate = true;
        steps.push({
          title: "Indeterminación detectada",
          tex: `= \\dfrac{0}{0}`,
          note: "Aplicaremos manipulación algebraica para resolverla.",
        });
      } else if (!isFinite(numV / denV)) {
        indeterminate = true;
        steps.push({
          title: "Indeterminación detectada",
          tex: `= \\dfrac{\\infty}{\\infty}`,
          note: "Aplicaremos manipulación algebraica para resolverla.",
        });
      }
    }
  }

  // Direct result available
  if (!indeterminate && directVal !== null) {
    const formatted = Number.isInteger(directVal) ? directVal.toString() : directVal.toFixed(6).replace(/\.?0+$/, "");
    steps.push({
      title: "Paso 2 — Evaluación final",
      tex: `\\lim_{x \\to ${targetTex}} ${exprTex} = ${formatted}`,
      note: "La sustitución directa da un valor definido.",
    });
    return { steps, resultTex: formatted, resultValue: directVal };
  }

  // Manipulation step
  let working: MathNode = node;

  if (indeterminate && isFraction(node)) {
    const [num, den] = (node as any).args as MathNode[];

    // RACIONALIZACIÓN if there's a sqrt
    if (hasSqrt(num) || hasSqrt(den)) {
      const target = hasSqrt(num) ? num : den;
      const conj = makeConjugate(target);
      if (conj) {
        const conjTex = nodeToTex(conj);
        steps.push({
          title: "Paso 2 — Racionalización",
          tex: `= \\dfrac{${nodeToTex(num)}}{${nodeToTex(den)}} \\cdot \\dfrac{${conjTex}}{${conjTex}}`,
          note: "Multiplicamos numerador y denominador por el conjugado.",
        });
        const newNum = math.parse(`(${num.toString()}) * (${conj.toString()})`);
        const newDen = math.parse(`(${den.toString()}) * (${conj.toString()})`);
        const sNum = safeSimplify(newNum);
        const sDen = safeSimplify(newDen);
        working = math.parse(`(${sNum.toString()}) / (${sDen.toString()})`);
        steps.push({
          title: "Paso 3 — Simplificación",
          tex: `= \\dfrac{${nodeToTex(sNum)}}{${nodeToTex(sDen)}}`,
          note: "Aplicamos diferencia de cuadrados y simplificamos.",
        });
      }
    } else {
      // FACTORIZACIÓN — try synthetic division by (x - a) on numerator and denominator
      const factored = aVal !== null ? factorOutRoot(num, den, aVal) : null;
      if (factored && factored.canceled > 0) {
        const newDen = factored.den.toString() === "1" ? null : factored.den;
        steps.push({
          title: "Paso 2 — Factorización",
          tex: `= \\dfrac{(x - ${aVal})\\,\\left(${nodeToTex(factored.num)}\\right)}{(x - ${aVal})\\,\\left(${nodeToTex(
            factored.den
          )}\\right)}`,
          note: `Factorizamos (x - ${aVal}) en numerador y denominador.`,
        });
        steps.push({
          title: "Paso 3 — Simplificación",
          tex: newDen
            ? `= \\dfrac{${nodeToTex(factored.num)}}{${nodeToTex(factored.den)}}`
            : `= ${nodeToTex(factored.num)}`,
          note: "Cancelamos el factor común.",
        });
        working = newDen ? math.parse(`(${factored.num.toString()})/(${factored.den.toString()})`) : factored.num;
      } else {
        // L'Hôpital fallback
        try {
          const dnum = math.derivative(num, "x");
          const dden = math.derivative(den, "x");
          steps.push({
            title: "Paso 2 — Regla de L'Hôpital",
            tex: `= \\lim_{x \\to ${targetTex}} \\dfrac{\\dfrac{d}{dx}\\left[${nodeToTex(num)}\\right]}{\\dfrac{d}{dx}\\left[${nodeToTex(den)}\\right]} = \\lim_{x \\to ${targetTex}} \\dfrac{${nodeToTex(dnum)}}{${nodeToTex(dden)}}`,
            note: "Derivamos numerador y denominador por separado.",
          });
          working = math.parse(`(${dnum.toString()})/(${dden.toString()})`);
        } catch {
          steps.push({
            title: "Paso 2 — Manipulación algebraica",
            note: "No fue posible resolver simbólicamente esta forma.",
          });
        }
      }
    }
  } else if (!indeterminate) {
    const simplifiedWhole = safeSimplify(node);
    if (simplifiedWhole.toString() !== node.toString()) {
      steps.push({
        title: "Paso 2 — Simplificación",
        tex: `= ${nodeToTex(simplifiedWhole)}`,
      });
      working = simplifiedWhole;
    }
  }

  // Final substitution
  const finalSubst = working.transform((n) => {
    if (n.type === "SymbolNode" && (n as any).name === "x") return a.cloneDeep();
    return n;
  });
  const finalVal = aVal !== null ? evalAt(working, aVal) : null;

  if (finalVal !== null) {
    const formatted = Number.isInteger(finalVal) ? finalVal.toString() : Number(finalVal.toFixed(6)).toString();
    steps.push({
      title: "Paso 4 — Evaluación final",
      tex: `\\lim_{x \\to ${targetTex}} ${exprTex} = ${nodeToTex(finalSubst)} = ${formatted}`,
      note: "Sustituimos nuevamente y obtenemos el resultado.",
    });
    return { steps, resultTex: formatted, resultValue: finalVal };
  }

  return { steps, resultTex: "\\text{No determinado}", resultValue: null };
}

function LimitCalculator() {
  const [numerator, setNumerator] = useState("x^2 - 4");
  const [denominator, setDenominator] = useState("x - 2");
  const [target, setTarget] = useState("2");
  const [error, setError] = useState<string | null>(null);

  const combinedExpr = useMemo(() => {
    const num = numerator.trim();
    const den = denominator.trim();
    if (!num) return "";
    if (!den) return num;
    return `(${num})/(${den})`;
  }, [numerator, denominator]);

  const result = useMemo<LimitResult | null>(() => {
    setError(null);
    if (!combinedExpr || !target.trim()) return null;
    try {
      return computeLimit(combinedExpr, target);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo procesar la expresión");
      return null;
    }
  }, [combinedExpr, target]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sigma className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Calculadora de Límites</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Resolución simbólica paso a paso. Soporta polinomios, raíces (sqrt), funciones trigonométricas y exponenciales.
      </p>

      <div className="limit-equation flex items-center gap-4 px-3 py-5 rounded-lg bg-background/30 border border-border/40">
        <div className="flex flex-col items-center shrink-0">
          <span className="limit-lim leading-none text-4xl">lim</span>
          <div className="flex items-center gap-1 mt-1 text-base limit-sub">
            <span className="italic">x</span>
            <span className="text-muted-foreground">→</span>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="a"
              aria-label="x tiende a"
              className="limit-input limit-input-sub w-12 text-center"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-stretch limit-fraction">
          <input
            value={numerator}
            onChange={(e) => setNumerator(e.target.value)}
            placeholder="numerador"
            aria-label="Numerador"
            className="limit-input limit-input-frac text-xl text-center"
          />
          <div className="limit-fraction-bar" aria-hidden="true" />
          <input
            value={denominator}
            onChange={(e) => setDenominator(e.target.value)}
            placeholder="denominador (opcional)"
            aria-label="Denominador"
            className="limit-input limit-input-frac text-xl text-center"
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Si el límite no es una fracción, deja el denominador vacío y escribe toda la expresión en el numerador.
      </p>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">RESULTADO</p>
            <div className="text-2xl text-primary">
              <Tex tex={`= ${result.resultTex}`} display />
            </div>
          </div>

          <ProcedureAccordion>
            {result.steps.map((s, i) => (
              <div key={i} className="border border-border rounded-lg p-3 bg-background/60 space-y-1">
                <p className="text-xs font-semibold">{s.title}</p>
                {s.tex && (
                  <div className="overflow-x-auto py-1">
                    <Tex tex={s.tex} display />
                  </div>
                )}
                {s.note && <p className="text-[11px] text-muted-foreground">{s.note}</p>}
              </div>
            ))}
          </ProcedureAccordion>
        </div>
      )}
    </div>
  );
}

function formatSci(n: number): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e-3 && abs < 1e6) {
    return Number(n.toPrecision(6)).toString();
  }
  const exp = Math.floor(Math.log10(abs));
  const mantissa = n / Math.pow(10, exp);
  return `${Number(mantissa.toPrecision(5))} \\times 10^{${exp}}`;
}

function CoulombCalculator() {
  const [q1, setQ1] = useState("2e-6");
  const [q2, setQ2] = useState("-3e-6");
  const [r, setR] = useState("0.5");

  const result = useMemo(() => {
    const a = Number(q1);
    const b = Number(q2);
    const d = Number(r);
    if (!isFinite(a) || !isFinite(b) || !isFinite(d) || d === 0) return null;
    const product = a * b;
    const absProduct = Math.abs(product);
    const rSquared = d * d;
    const force = (COULOMB_K * absProduct) / rSquared;
    const repulsive = product > 0;
    return { a, b, d, product, absProduct, rSquared, force, repulsive };
  }, [q1, q2, r]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-chart-3" />
        <h3 className="font-semibold">Cargas Eléctricas (Ley de Coulomb)</h3>
      </div>
      <div className="text-xs text-muted-foreground">
        <Tex tex={`F = k \\dfrac{|q_1 \\cdot q_2|}{r^2}`} />
        {"  con  "}
        <Tex tex={`k = 9 \\times 10^{9}\\,\\mathrm{N \\cdot m^2 / C^2}`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">q₁ (C)</Label>
          <Input value={q1} onChange={(e) => setQ1(e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">q₂ (C)</Label>
          <Input value={q2} onChange={(e) => setQ2(e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">r (m)</Label>
          <Input value={r} onChange={(e) => setR(e.target.value)} className="font-mono" />
        </div>
      </div>

      {!result ? (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          Verifica los valores ingresados (r no puede ser 0).
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-chart-3/10 border border-chart-3/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">FUERZA ELÉCTRICA RESULTANTE</p>
            <div className="text-2xl text-chart-3">
              <Tex tex={`F = ${formatSci(result.force)}\\,\\mathrm{N}`} display />
            </div>
            <p className="text-xs mt-2">
              Tipo de interacción:{" "}
              <span className={`font-semibold ${result.repulsive ? "text-amber-500" : "text-sky-500"}`}>
                {result.repulsive ? "Repulsiva" : "Atractiva"}
              </span>{" "}
              <span className="text-muted-foreground">
                ({result.repulsive ? "cargas del mismo signo" : "cargas de signo opuesto"})
              </span>
            </p>
          </div>

          <ProcedureAccordion>
            <div className="border border-border rounded-lg p-3 bg-background/60 space-y-1">
              <p className="text-xs font-semibold">Paso 1 — Datos</p>
              <div className="overflow-x-auto py-1">
                <Tex
                  tex={`q_1 = ${formatSci(result.a)}\\,\\mathrm{C}, \\quad q_2 = ${formatSci(
                    result.b
                  )}\\,\\mathrm{C}, \\quad r = ${formatSci(result.d)}\\,\\mathrm{m}`}
                  display
                />
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-background/40 space-y-1">
              <p className="text-xs font-semibold">Paso 2 — Fórmula</p>
              <div className="overflow-x-auto py-1">
                <Tex tex={`F = k \\dfrac{|q_1 \\cdot q_2|}{r^2}`} display />
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-background/40 space-y-1">
              <p className="text-xs font-semibold">Paso 3 — Sustitución</p>
              <div className="overflow-x-auto py-1">
                <Tex
                  tex={`F = (9 \\times 10^{9}) \\cdot \\dfrac{|(${formatSci(result.a)}) \\cdot (${formatSci(
                    result.b
                  )})|}{(${formatSci(result.d)})^2}`}
                  display
                />
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-background/40 space-y-1">
              <p className="text-xs font-semibold">Paso 4 — Cálculo</p>
              <div className="overflow-x-auto py-1 space-y-1">
                <Tex
                  tex={`q_1 \\cdot q_2 = ${formatSci(result.product)} \\;\\Rightarrow\\; |q_1 \\cdot q_2| = ${formatSci(
                    result.absProduct
                  )}`}
                  display
                />
                <Tex tex={`r^2 = ${formatSci(result.rSquared)}\\,\\mathrm{m^2}`} display />
                <Tex
                  tex={`F = \\dfrac{(9 \\times 10^{9}) \\cdot (${formatSci(result.absProduct)})}{${formatSci(
                    result.rSquared
                  )}}`}
                  display
                />
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-background/60 space-y-1">
              <p className="text-xs font-semibold">Paso 5 — Resultado final</p>
              <div className="overflow-x-auto py-1">
                <Tex tex={`F = ${formatSci(result.force)}\\,\\mathrm{N}`} display />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Como{" "}
                {result.repulsive
                  ? "las cargas tienen el mismo signo, la fuerza es repulsiva."
                  : "las cargas tienen signo opuesto, la fuerza es atractiva."}
              </p>
            </div>
          </ProcedureAccordion>
        </div>
      )}
    </div>
  );
}

export function AcademicTools() {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold">Herramientas Académicas</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LimitCalculator />
        <CoulombCalculator />
      </div>
    </div>
  );
}
