import Groq from "groq-sdk";

export function getGroqClient(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function callGroq(
  systemPrompt: string,
  userContent: string
): Promise<string> {
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
}
