import type { ReportPeriod } from "@/lib/reports/types";
import { sendReportEmailWithAttachment } from "@/lib/email";

interface SendReportEmailInput {
  to: string;
  name: string;
  period: ReportPeriod;
  periodLabel: string;
  pdfBuffer: Buffer;
  filename: string;
}

interface SendReportEmailResult {
  messageId?: string;
  provider?: "resend" | "smtp";
}

function periodTitle(period: ReportPeriod) {
  return period === "daily" ? "Daily" : "Weekly";
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<SendReportEmailResult> {
  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_USER || !process.env.SMTP_PASS)) {
    throw new Error("Configure RESEND_API_KEY or SMTP_USER/SMTP_PASS.");
  }
  if (!process.env.RESEND_FROM_EMAIL && !process.env.EMAIL_FROM) {
    throw new Error("RESEND_FROM_EMAIL or EMAIL_FROM is missing.");
  }

  const title = periodTitle(input.period);
  const subject = `Your PostureX ${title} Posture Report`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <p>Hello ${input.name},</p>
      <p>Your posture report for <strong>${input.periodLabel}</strong> is ready.</p>
      <p>Keep improving your posture health with PostureX.</p>
    </div>
  `;

  const info = await sendReportEmailWithAttachment({
    to: input.to,
    subject,
    html,
    filename: input.filename,
    content: input.pdfBuffer
  });

  return { messageId: info.messageId, provider: info.provider };
}
