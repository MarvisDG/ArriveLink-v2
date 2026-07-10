import { NextResponse } from "next/server";
import { checkAdminSecret, getOperatorFromToken } from "@/lib/mock-db";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function requireAdmin(request: Request) {
  const secret = request.headers.get("x-admin-secret") ?? "";
  if (!checkAdminSecret(secret)) {
    return jsonError("Unauthorized", 401);
  }
  return null;
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

export function requireOperator(request: Request) {
  const token = getBearerToken(request);
  const operator = getOperatorFromToken(token);
  if (!operator) {
    return { error: jsonError("Unauthorized", 401) as NextResponse, operator: null };
  }
  return { error: null, operator };
}
