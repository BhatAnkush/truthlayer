import nodemailer from "nodemailer";
import { buildShareEmail } from "@/lib/emails/buildShareEmail";

type SendShareEmailProps = {
  recipientEmail: string;
  recipientName: string;
  sharerName: string;
  sharerImageUrl?: string;
  articleTitle: string;
  analysisUrl: string;
  appUrl: string;
  appIconUrl?: string;
};

function buildSubject(articleTitle: string): string {
  const title = articleTitle.trim();
  if (!title) {
    return "A TruthLayer analysis was shared with you";
  }
  return `Shared analysis: ${title}`;
}

function greetingName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "there";
  }
  return trimmed;
}

export async function sendShareEmail(
  props: SendShareEmailProps,
): Promise<void> {
  const smtpUser = process.env.GMAIL_USER;
  const smtpPass = process.env.GMAIL_APP_PASSWORD;
  if (!smtpUser || !smtpPass) {
    throw new Error("smtp_credentials_missing");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const html = buildShareEmail({
    sharerName: props.sharerName,
    sharerImageUrl: props.sharerImageUrl,
    articleTitle: props.articleTitle,
    analysisUrl: props.analysisUrl,
    appUrl: props.appUrl,
    appIconUrl: props.appIconUrl,
  });

  const text = `${greetingName(props.recipientName)}, ${props.sharerName} shared a TruthLayer analysis with you: ${props.analysisUrl}`;

  await transporter.sendMail({
    from: `TruthLayer <${smtpUser}>`,
    to: props.recipientEmail,
    subject: buildSubject(props.articleTitle),
    html,
    text,
  });
}
