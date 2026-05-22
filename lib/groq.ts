import Groq from "groq-sdk";

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: unknown }).type === "error"
  ) {
    const rawMessage =
      ("message" in error && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : undefined) ??
      ("reason" in error && typeof (error as { reason?: unknown }).reason === "string"
        ? (error as { reason: string }).reason
        : undefined);

    const message = rawMessage && rawMessage.trim().length > 0
      ? rawMessage
      : "Network request failed";

    return new Error(message);
  }

  return new Error(String(error));
}

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("groq_key_missing");
  }

  return new Groq({ apiKey, timeout: 30000, maxRetries: 1 });
}

export async function callGroq(
  systemPrompt: string,
  userContent: string
): Promise<string> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    const message = normalizeError(error).message;

    if (message === "groq_key_missing") {
      throw new Error("Groq API key is missing. Set GROQ_API_KEY in your environment.");
    }

    if (
      message.toLowerCase().includes("errorevent") ||
      message.toLowerCase().includes("fetch") ||
      message.toLowerCase().includes("network")
    ) {
      throw new Error("Could not reach Groq API. Check your network, proxy, or firewall settings and try again.");
    }

    throw normalizeError(error);
  }
}
