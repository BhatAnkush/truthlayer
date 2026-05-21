import Groq from "groq-sdk";

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
    const message = error instanceof Error ? error.message : String(error);

    if (message === "groq_key_missing") {
      throw new Error("Groq API key is missing. Set GROQ_API_KEY in your environment.");
    }

    if (message.toLowerCase().includes("errorevent") || message.toLowerCase().includes("fetch")) {
      throw new Error("Could not reach Groq API. Check your network, proxy, or firewall settings and try again.");
    }

    throw error;
  }
}
