import * as cheerio from "cheerio";

export async function extractArticle(
  url: string
): Promise<{ title: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let html: string;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    if (!response.ok) throw new Error("scrape_failed");
    html = await response.text();
  } catch {
    throw new Error("scrape_failed");
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);

  // Strip noise
  $(
    "script, style, noscript, nav, header, footer, aside, iframe, " +
    ".ad, .ads, .advertisement, .cookie, .popup, .modal, .sidebar, " +
    "[class*='nav'], [class*='menu'], [class*='footer'], [class*='header'], " +
    "[class*='cookie'], [class*='banner'], [id*='nav'], [id*='menu'], " +
    "[id*='footer'], [id*='header'], [id*='sidebar']"
  ).remove();

  // Title
  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    "Untitled";

  // Article content — try specific containers first
  const articleSelectors = [
    "article",
    '[role="main"]',
    "main",
    ".article-body",
    ".article-content",
    ".post-content",
    ".entry-content",
    ".story-body",
    ".content-body",
    "#article-body",
    "#content",
  ];

  let text = "";

  for (const selector of articleSelectors) {
    const el = $(selector);
    if (el.length) {
      text = el
        .find("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 40)
        .join("\n\n");

      if (text.length > 200) break;
    }
  }

  // Fallback — all paragraphs on the page
  if (text.length < 200) {
    text = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 40)
      .join("\n\n");
  }

  if (!text || text.length < 100) {
    throw new Error("scrape_failed");
  }

  return { title, text };
}