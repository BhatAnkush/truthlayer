import { NextRequest, NextResponse } from "next/server";
import { extractArticle } from "@/lib/scraper";
import { prepareText } from "@/lib/chunker";
import { callGroq } from "@/lib/groq";
import { COMPARE_SYSTEM } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url1, url2 } = body as { url1: string; url2: string };

    if (!url1 || !url2) {
      return NextResponse.json(
        { error: "missing_urls", message: "Both URLs are required." },
        { status: 400 }
      );
    }

    const [art1, art2] = await Promise.all([
      extractArticle(url1).catch(() => {
        throw new Error("scrape_failed_1");
      }),
      extractArticle(url2).catch(() => {
        throw new Error("scrape_failed_2");
      }),
    ]);

    const [text1, text2] = await Promise.all([
      prepareText(art1.text),
      prepareText(art2.text),
    ]);

    const userContent = `Article 1: "${art1.title}"\n\n${text1}\n\n---\n\nArticle 2: "${art2.title}"\n\n${text2}`;
    const raw = await callGroq(COMPARE_SYSTEM, userContent);

    let result: unknown;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      return NextResponse.json(
        { error: "parse_failed", message: "AI returned an invalid response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("scrape_failed")) {
      const which = msg === "scrape_failed_1" ? "first" : "second";
      return NextResponse.json(
        { error: "scrape_failed", message: `Could not scrape the ${which} URL.` },
        { status: 422 }
      );
    }
    console.error("Compare error:", err);
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
