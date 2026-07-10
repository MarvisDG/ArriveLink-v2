import { NextResponse } from "next/server";
import { searchRoutes } from "@/lib/mock-db";
import { jsonError } from "@/lib/api-helpers";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fromCityId = parseInt(searchParams.get("from_city_id") ?? "", 10);
  const toCityId = parseInt(searchParams.get("to_city_id") ?? "", 10);

  if (!fromCityId || !toCityId) {
    return jsonError("from_city_id and to_city_id are required");
  }

  return NextResponse.json(searchRoutes(fromCityId, toCityId));
}
