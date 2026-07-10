import { NextResponse } from "next/server";
import { initiateUnlock } from "@/lib/mock-db";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(initiateUnlock(body));
}
