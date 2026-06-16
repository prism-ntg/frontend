import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only"
);

export interface AuthUser {
  id: number;
  email: string;
  role: "admin" | "teknisi";
}

export async function getCurrentUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: Number(payload.id),
      email: String(payload.email),
      role: (payload.role as "admin" | "teknisi") ?? "admin",
    };
  } catch {
    return null;
  }
}

export { JWT_SECRET };
