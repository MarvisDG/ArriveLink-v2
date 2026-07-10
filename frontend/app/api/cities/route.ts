import { NextResponse } from "next/server";
import { getCities } from "@/lib/mock-db";

export function GET() {
  return NextResponse.json(getCities());
}
