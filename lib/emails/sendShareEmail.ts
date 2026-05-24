import { Resend } from "resend";
import { buildShareEmail } from "@/lib/emails/buildShareEmail";

type SendShareEmailProps = {
  recipientEmail: string;
  recipientName: string;
  sharerName: string;
  articleTitle: string;
  factCount: number;
  opinionCount: number;
  fallacyCount: number;
  missingCount: number;
  manipulationScore: number;
  fearScore: number;
  analysisUrl: string;
  appUrl: string;
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

export async function sendShareEmail(props: SendShareEmailProps): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("resend_key_missing");
  }

  const resend = new Resend(resendApiKey);

  const html = buildShareEmail({
    sharerName: props.sharerName,
    articleTitle: props.articleTitle,
    factCount: props.factCount,
    opinionCount: props.opinionCount,
    fallacyCount: props.fallacyCount,
    missingCount: props.missingCount,
    manipulationScore: props.manipulationScore,
    fearScore: props.fearScore,
    analysisUrl: props.analysisUrl,
    appUrl: props.appUrl,
  });

  const text = `${greetingName(props.recipientName)}, ${props.sharerName} shared a TruthLayer analysis with you: ${props.analysisUrl}`;

  await resend.emails.send({
    from: "TruthLayer <ankushbhataab@gmail.com>",
    to: props.recipientEmail,
    subject: buildSubject(props.articleTitle),
    html,
    text,
  });
}
