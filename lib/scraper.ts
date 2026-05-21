import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export async function extractArticle(
  url: string
): Promise<{ title: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let html: string;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
    });
    html = await response.text();
  } catch {
    throw new Error("scrape_failed");
  } finally {
    clearTimeout(timeout);
  }

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (!article || !article.textContent) {
    throw new Error("scrape_failed");
  }

  return {
    title: article.title ?? "Untitled",
    text: article.textContent.trim(),
  };
}
