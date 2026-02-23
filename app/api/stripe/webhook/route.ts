import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe webhook is disabled for UPI-only billing." },
    { status: 410 }
  );
}
