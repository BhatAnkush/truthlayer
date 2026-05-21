import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { extractArticle } from "@/lib/scraper";
import { prepareText } from "@/lib/chunker";
import { callGroq } from "@/lib/groq";
import { ANALYSE_SYSTEM } from "@/lib/prompts";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["fact", "opinion", "fallacy", "missing_context"]),
  confidence: z.number(),
  reasoning: z.string(),
});

const AnalysisSchema = z.object({
  claims: z.array(ClaimSchema),
  connections: z.array(
    z.object({ from: z.string(), to: z.string(), label: z.string() })
  ),
  manipulation_score: z.object({
    fear_language: z.number(),
    urgency_bait: z.number(),
    false_equivalence: z.number(),
    missing_sources: z.number(),
    emotional_appeals: z.number(),
  }),
  overall_bias: z.enum(["left", "right", "centre", "unclear"]),
  summary: z.string(),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "unauthorized", message: "Please sign in to analyze articles." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url, text } = body as { url?: string; text?: string };

    let title = "Pasted Article";
    let articleText = text ?? "";

    if (url) {
      try {
        const extracted = await extractArticle(url);
        title = extracted.title;
        articleText = extracted.text;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "scrape_failed") {
          return NextResponse.json(
            {
              error: "scrape_failed",
              message:
                "Could not scrape this URL. Paste the article text instead.",
            },
            { status: 422 }
          );
        }
        throw err;
      }
    }

    if (!articleText.trim()) {
      return NextResponse.json(
        { error: "no_content", message: "No article content provided." },
        { status: 400 }
      );
    }

    const preparedText = await prepareText(articleText);
    const raw = await callGroq(
      ANALYSE_SYSTEM,
      `Article title: ${title}\n\n${preparedText}`
    );

    let parsed: unknown;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json(
        { error: "parse_failed", message: "AI returned an invalid response. Please try again." },
        { status: 500 }
      );
    }

    const result = AnalysisSchema.parse(parsed);

    const analysis = await prisma.analysis.create({
      data: {
        url: url ?? null,
        title,
        rawText: articleText.slice(0, 10000),
        result: result as object,
      },
    });

    return NextResponse.json({ id: analysis.id, result });
  } catch (err) {
    console.error("Analysis error:", err);

    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("Groq API key is missing") ||
      message.includes("Could not reach Groq API")
    ) {
      return NextResponse.json(
        { error: "ai_unavailable", message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "server_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
