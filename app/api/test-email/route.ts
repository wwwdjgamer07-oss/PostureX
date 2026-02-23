import { NextResponse } from "next/server";
import { sendReportEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST() {
  const to = process.env.SMTP_USER;
  if (!to) {
    return NextResponse.json({ success: false, error: "SMTP_USER is missing." }, { status: 500 });
  }

  try {
    const subject = "PostureX SMTP test email";
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>PostureX SMTP Test</h2>
        <p>This is a test email sent via Gmail SMTP + Nodemailer.</p>
      </div>
    `;
    const info = await sendReportEmail(to, subject, html);
    return NextResponse.json({
      success: true,
      to,
      messageId: info.messageId ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send test email.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
