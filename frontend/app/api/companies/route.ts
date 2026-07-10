import { NextResponse } from "next/server";
import { getCompanyList } from "@/lib/mock-db";

export function GET() {
  return NextResponse.json(getCompanyList());
}
