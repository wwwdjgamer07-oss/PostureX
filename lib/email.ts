import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

interface SendEmailResult {
  messageId?: string;
  provider: "resend" | "smtp";
}

function resolveFromEmail() {
  return process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "PostureX <no-reply@posturex.in>";
}

async function sendWithResend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: resolveFromEmail(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      attachments: (input.attachments ?? []).map((item) => ({
        filename: item.filename,
        content: item.content.toString("base64")
      }))
    })
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { message?: string };
      detail = payload.message ? ` ${payload.message}` : "";
    } catch {
      // no-op
    }
    throw new Error(`Resend API failed (${response.status}).${detail}`.trim());
  }

  const body = (await response.json()) as { id?: string };
  return { messageId: body.id, provider: "resend" };
}

async function sendWithSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const info = await transporter.sendMail({
    from: resolveFromEmail(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments
  });
  return { messageId: info.messageId, provider: "smtp" };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (process.env.RESEND_API_KEY) {
    return sendWithResend(input);
  }
  return sendWithSmtp(input);
}

export async function sendReportEmail(to: string, subject: string, html: string) {
  return sendEmail({
    to,
    subject,
    html
  });
}

export async function sendReportEmailWithAttachment(input: {
  to: string;
  subject: string;
  html: string;
  filename: string;
  content: Buffer;
}) {
  return sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: [
      {
        filename: input.filename,
        content: input.content
      }
    ]
  });
}

export async function sendRawEmail(to: string, subject: string, html: string) {
  return sendEmail({
    to,
    subject,
    html
  });
}

export { transporter };
