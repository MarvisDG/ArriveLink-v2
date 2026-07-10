import { NextResponse } from "next/server";
import { submitReview } from "@/lib/mock-db";

export async function POST(request: Request) {
  const body = await request.json();
  const review = submitReview(body);
  return NextResponse.json(review);
}
