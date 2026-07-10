import { NextResponse } from "next/server";
import { getCompanyReviews } from "@/lib/mock-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(getCompanyReviews(parseInt(id, 10)));
}
