import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe checkout has been retired. Use UPI pricing flow." },
    { status: 410 }
  );
}
