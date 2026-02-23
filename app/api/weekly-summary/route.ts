import { NextResponse } from "next/server";

export async function GET() {
  // In a real app, this would call an LLM service to generate a summary based on user data
  return NextResponse.json({
    summary: "Your posture has shown a 12% improvement in stability this week. Focus on reducing forward head tilt during afternoon sessions."
  });
}