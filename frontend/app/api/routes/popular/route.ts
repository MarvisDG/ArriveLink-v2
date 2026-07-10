import { NextResponse } from "next/server";
import { getPopularRoutes } from "@/lib/mock-db";

export function GET() {
  return NextResponse.json(getPopularRoutes());
}
