import { NextResponse } from "next/server";
import { operatorLogin } from "@/lib/mock-db";
import { jsonError } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(operatorLogin(body.email, body.password));
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Login failed", 401);
  }
}
