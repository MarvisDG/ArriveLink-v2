import { NextResponse } from "next/server";
import { getFeaturedCompanies } from "@/lib/mock-db";

export function GET() {
  return NextResponse.json(getFeaturedCompanies());
}
