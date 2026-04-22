import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { usePunch, useVerifyIdentity } from "@workspace/api-client-react";
import { useTheme } from "@/contexts/ThemeContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Delete,
  CheckCircle2,
  XCircle,
  Clock,
  Sun,
  Moon,
  Shield,
  Timer,
  TrendingUp,
  Lock,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type PunchResult = {
  type: "check_in" | "check_out";
  message: string;
  employeeName: string;
  department: string;
  success: boolean;
  workedHours?: number;
  extraHours?: number;
  checkInTime?: string | null;
  checkOutTime?: string | null;
} | null;

type Step = "id" | "factor" | "result";

type FactorState = {
  documentNumber: string;
  employeeName: string;
  department?: string;
  requiresPin: boolean;
  requiresPhoneLast4: boolean;
};

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function Terminal() {
  const [step, setStep] = useState<Step>("id");
  const [digits, setDigits] = useState("");
  const [pinDigits, setPinDigits] = useState("");
  const [factor, setFactor] = useState<FactorState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [result, setResult] = useState<PunchResult>(null);
  const verifyMutation = useVerifyIdentity();
  const punchMutation = usePunch();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const resetAll = useCallback(() => {
    setDigits("");
    setPinDigits("");
    setFactor(null);
    setErrorMsg(null);
    setResult(null);
    setStep("id");
  }, []);

  useEffect(() => {
    if (step === "result") {
      const timeout = setTimeout(resetAll, 5000);
      return () => clearTimeout(timeout);
    }
  }, [step, resetAll]);

  // Step 1 — submit document
  const submitId = useCallback(async () => {
    if (!digits || verifyMutation.isPending) return;
    setErrorMsg(null);
    try {
      const res = await verifyMutation.mutateAsync({ data: { documentNumber: digits } });
      setFactor({
        documentNumber: digits,
        employeeName: res.employeeName,
        department: res.department,
        requiresPin: res.requiresPin,
        requiresPhoneLast4: res.requiresPhoneLast4,
      });
      // If no second factor required at all, go straight to punch
      if (!res.requiresPin && !res.requiresPhoneLast4) {
        await doPunch(digits, undefined, undefined);
      } else {
        setPinDigits("");
        setStep("factor");
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const errText = e?.response?.data?.error;
      if (status === 423) {
        setResult({
          type: "check_in",
          success: false,
          employeeName: "",
          department: "",
          message: errText ?? "Terminal bloqueado temporalmente.",
        });
        setStep("result");
      } else {
        setErrorMsg(errText ?? "Empleado no encontrado.");
      }
    }
  }, [digits, verifyMutation]); // eslint-disable-line

  const doPunch = useCallback(
    async (documentNumber: string, pin?: string, phoneLast4?: string) => {
      try {
        const res = await punchMutation.mutateAsync({
          data: { documentNumber, ...(pin ? { pin } : {}), ...(phoneLast4 ? { phoneLast4 } : {}) },
        });
        setResult({
          type: res.type,
          message: res.message,
          employeeName: res.employee.name,
          department: res.employee.department,
          success: true,
          workedHours: res.todaySummary.workedHours,
          extraHours: res.todaySummary.extraHours,
          checkInTime: res.todaySummary.checkInTime,
          checkOutTime: res.todaySummary.checkOutTime,
        });
        setStep("result");
      } catch (e: any) {
        const status = e?.response?.status;
        const data = e?.response?.data;
        if (status === 423) {
          setResult({
            type: "check_in",
            success: false,
            employeeName: "",
            department: "",
            message: data?.error ?? "Terminal bloqueado por 60 segundos.",
          });
          setStep("result");
        } else if (status === 401) {
          setPinDigits("");
          setErrorMsg(data?.error ?? "Verificación fallida.");
        } else {
          setResult({
            type: "check_in",
            success: false,
            employeeName: "",
            department: "",
            message: data?.error ?? "No se pudo registrar la asistencia.",
          });
          setStep("result");
        }
      }
    },
    [punchMutation]
  );

  // Step 2 — submit second factor
  const submitFactor = useCallback(async () => {
    if (!factor || pinDigits.length !== 4 || punchMutation.isPending) return;
    setErrorMsg(null);
    if (factor.requiresPin) {
      await doPunch(factor.documentNumber, pinDigits, undefined);
    } else if (factor.requiresPhoneLast4) {
      await doPunch(factor.documentNumber, undefined, pinDigits);
    }
  }, [factor, pinDigits, doPunch, punchMutation]);

  // Keypad handlers
  const handleDigit = useCallback(
    (d: string) => {
      if (step === "id") {
        if (digits.length < 12) setDigits((p) => p + d);
      } else if (step === "factor") {
        if (pinDigits.length < 4) setPinDigits((p) => p + d);
      }
    },
    [step, digits, pinDigits]
  );

  const handleClear = useCallback(() => {
    if (step === "id") setDigits((p) => p.slice(0, -1));
    else if (step === "factor") setPinDigits((p) => p.slice(0, -1));
  }, [step]);

  const handleSubmit = useCallback(() => {
    if (step === "id") submitId();
    else if (step === "factor") submitFactor();
  }, [step, submitId, submitFactor]);

  // Auto-submit second factor when 4 digits entered
  useEffect(() => {
    if (step === "factor" && pinDigits.length === 4 && !punchMutation.isPending) {
      submitFactor();
    }
  }, [step, pinDigits, submitFactor, punchMutation.isPending]);

  // Keyboard support
  useEffect(() => {
    if (step === "result") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleClear();
      else if (e.key === "Enter") handleSubmit();
      else if (e.key === "Escape") {
        if (step === "factor") {
          setStep("id");
          setPinDigits("");
          setErrorMsg(null);
        } else {
          setDigits("");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, handleDigit, handleClear, handleSubmit]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  const currentValue = step === "id" ? digits : pinDigits;
  const factorLabel = factor?.requiresPin
    ? "PIN personal (4 dígitos)"
    : factor?.requiresPhoneLast4
      ? "Últimos 4 dígitos del teléfono"
      : "";
  const isBusy = verifyMutation.isPending || punchMutation.isPending;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-3 sm:p-4">
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
        <Link href="/login">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground text-xs">
            <Shield className="w-3.5 h-3.5" />
            Modo Administrador
          </Button>
        </Link>
      </div>
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={toggleTheme}
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <div className="w-full max-w-sm sm:max-w-md mt-12 sm:mt-0">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold font-mono text-primary tracking-tight">TimeTrackPro</span>
          </div>
          <div className="text-5xl sm:text-6xl font-mono font-bold tabular-nums tracking-tight">
            {format(time, "HH:mm:ss")}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 capitalize px-2">
            {format(time, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
          {step === "result" && result ? (
            <div className="p-8 text-center">
              {result.success ? (
                <>
                  <CheckCircle2
                    className={`w-14 h-14 mx-auto mb-3 ${
                      result.type === "check_in" ? "text-chart-2" : "text-chart-3"
                    }`}
                  />
                  <p className="text-xl font-bold">{result.employeeName}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{result.department}</p>
                  <div
                    className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold ${
                      result.type === "check_in"
                        ? "bg-chart-2/10 text-chart-2"
                        : "bg-chart-3/10 text-chart-3"
                    }`}
                  >
                    {result.message}
                  </div>
                  {result.workedHours !== undefined && result.workedHours > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-secondary rounded-xl px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Trabajado</span>
                        </div>
                        <span className="font-mono font-bold text-sm">{formatHours(result.workedHours)}</span>
                      </div>
                      <div
                        className={`rounded-xl px-3 py-3 text-center ${
                          result.extraHours && result.extraHours > 0 ? "bg-chart-2/10" : "bg-secondary"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Extras</span>
                        </div>
                        <span
                          className={`font-mono font-bold text-sm ${
                            result.extraHours && result.extraHours > 0 ? "text-chart-2" : ""
                          }`}
                        >
                          {formatHours(result.extraHours ?? 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Lock className="w-14 h-14 mx-auto mb-4 text-destructive" />
                  <p className="text-lg font-semibold">Acceso denegado</p>
                  <div className="mt-4 px-4 py-2 rounded-lg text-sm bg-destructive/10 text-destructive">
                    {result.message}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-6">
              {step === "factor" && factor && (
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <button
                    onClick={() => {
                      setStep("id");
                      setPinDigits("");
                      setErrorMsg(null);
                    }}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Atrás
                  </button>
                  <span className="text-foreground font-medium">· {factor.employeeName}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center mb-3 font-medium uppercase tracking-wider">
                {step === "id" ? "Número de documento" : factorLabel}
              </p>

              <div className="bg-secondary rounded-xl px-4 py-3 mb-3 min-h-[52px] flex items-center">
                {step === "factor" ? (
                  <div className="flex-1 flex items-center justify-center gap-3">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-3xl tracking-[0.6em] text-foreground">
                      {pinDigits.replace(/./g, "•").padEnd(4, "○")}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="font-mono text-2xl tracking-widest text-foreground flex-1">
                      {digits.replace(/(.{4})/g, "$1 ").trim() || ""}
                    </span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {digits.length > 0 ? `${digits.length} díg.` : "—"}
                    </span>
                  </>
                )}
              </div>

              {errorMsg && (
                <div className="mb-3 px-3 py-2 rounded-lg text-sm bg-destructive/10 text-destructive border border-destructive/20">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {keys.map((key, i) => (
                  <div key={i}>
                    {key === "" ? (
                      <div />
                    ) : key === "back" ? (
                      <button
                        onClick={handleClear}
                        className="w-full aspect-square flex items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-secondary/80 active:scale-95 transition-all"
                      >
                        <Delete className="w-6 h-6 sm:w-5 sm:h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDigit(key)}
                        className="w-full aspect-square flex items-center justify-center rounded-xl bg-secondary text-foreground hover:bg-secondary/70 active:scale-95 transition-all text-2xl sm:text-xl font-semibold font-mono"
                      >
                        {key}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {step === "id" && (
                <button
                  onClick={handleSubmit}
                  disabled={currentValue.length === 0 || isBusy}
                  className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isBusy ? "Verificando…" : "Continuar"}
                </button>
              )}

              {step === "factor" && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {isBusy ? "Registrando…" : "Ingrese 4 dígitos para confirmar"}
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Teclado físico: números para ingresar · Enter para confirmar · Esc para limpiar
        </p>
      </div>
    </div>
  );
}
