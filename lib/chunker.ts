import { callGroq } from "./groq";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function prepareText(text: string): Promise<string> {
  const tokens = estimateTokens(text);
  if (tokens < 6000) return text;

  const chunkSize = 3000 * 4; // ~3000 tokens in chars
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  const summaries = await Promise.all(
    chunks.map((chunk) =>
      callGroq(
        "You are a precise summariser.",
        `Summarise this article section in 300 words preserving all key claims and facts:\n\n${chunk}`
      )
    )
  );

  return summaries.join("\n\n");
}
