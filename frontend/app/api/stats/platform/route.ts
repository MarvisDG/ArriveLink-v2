import { NextResponse } from "next/server";
import { getPlatformStats } from "@/lib/mock-db";

export function GET() {
  return NextResponse.json(getPlatformStats());
}
