import jwt from "jsonwebtoken";

const SECRET = process.env.SESSION_SECRET ?? "timetrack-secret-key";

export interface JWTPayload {
  userId: number;
  role: string;
  email: string;
  companyId: number | null;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, SECRET) as JWTPayload;
}
