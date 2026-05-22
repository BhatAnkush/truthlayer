import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { extractArticle } from "@/lib/scraper";
import { prepareText } from "@/lib/chunker";
import { callGroq } from "@/lib/groq";
import { ANALYSE_SYSTEM } from "@/lib/prompts";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

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

function isNetworkLikeError(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("network") ||
    lowered.includes("fetch") ||
    lowered.includes("errorevent") ||
    lowered.includes("timeout") ||
    lowered.includes("econn")
  );
}

function extractErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  const candidates = [
    (error as { code?: unknown }).code,
    (error as { errno?: unknown }).errno,
    (error as { name?: unknown }).name,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().toUpperCase();
    }
  }

  return "";
}

function isTransientDatabaseError(error: unknown): boolean {
  const code = extractErrorCode(error);
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH" ||
    code === "P1001"
  ) {
    return true;
  }

  const normalized = normalizeError(error);
  return isNetworkLikeError(normalized.message);
}

const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["fact", "opinion", "fallacy", "missing_context"]),
  confidence: z.coerce.number().min(0).max(1),
  reasoning: z.string(),
});

const AnalysisSchema = z.object({
  claims: z.array(ClaimSchema),
  connections: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      label: z.enum(["contradicts", "supports", "depends_on"]),
    })
  ),
  manipulation_score: z.object({
    fear_language: z.coerce.number().min(0).max(10),
    urgency_bait: z.coerce.number().min(0).max(10),
    false_equivalence: z.coerce.number().min(0).max(10),
    missing_sources: z.coerce.number().min(0).max(10),
    emotional_appeals: z.coerce.number().min(0).max(10),
  }),
  overall_bias: z.enum(["left", "right", "centre", "unclear"]),
  summary: z.string(),
});

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("empty_ai_response");
  }

  // Handle fenced JSON blocks if the model wraps output.
  const codeFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = codeFence ? codeFence[1] : trimmed;

  const jsonMatch = candidate.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : candidate);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeClaimType(value: unknown): "fact" | "opinion" | "fallacy" | "missing_context" {
  const raw = String(value ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (raw === "fact") return "fact";
  if (raw === "opinion") return "opinion";
  if (raw === "fallacy") return "fallacy";
  if (raw === "missing_context" || raw === "missingcontext") return "missing_context";
  return "opinion";
}

function normalizeBias(value: unknown): "left" | "right" | "centre" | "unclear" {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "left") return "left";
  if (raw === "right") return "right";
  if (raw === "centre" || raw === "center") return "centre";
  return "unclear";
}

function normalizeConnectionLabel(value: unknown): "contradicts" | "supports" | "depends_on" {
  const raw = String(value ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (raw.includes("contradict")) return "contradicts";
  if (raw.includes("support")) return "supports";
  if (raw.includes("depend")) return "depends_on";
  return "supports";
}

function normalizeConfidence(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.6;
  // Many models return confidence as percentage 0-100.
  if (n > 1) return clamp(n / 100, 0, 1);
  return clamp(n, 0, 1);
}

function normalizeScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return clamp(n, 0, 10);
}

function normalizeAnalysisPayload(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) {
    const fallbackSummary = String(payload ?? "").trim();
    return {
      claims: [],
      connections: [],
      manipulation_score: {
        fear_language: 0,
        urgency_bait: 0,
        false_equivalence: 0,
        missing_sources: 0,
        emotional_appeals: 0,
      },
      overall_bias: "unclear",
      summary: fallbackSummary || "No summary generated.",
    };
  }

  const source = payload as Record<string, unknown>;
  const claimsSource = Array.isArray(source.claims) ? source.claims : [];
  const connectionsSource =
    Array.isArray(source.connections) ? source.connections :
    Array.isArray(source.relations) ? source.relations :
    Array.isArray(source.links) ? source.links :
    [];

  const scoreSource =
    (typeof source.manipulation_score === "object" && source.manipulation_score !== null
      ? source.manipulation_score
      : typeof source.manipulationScore === "object" && source.manipulationScore !== null
      ? source.manipulationScore
      : typeof source.scores === "object" && source.scores !== null
      ? source.scores
      : {}) as Record<string, unknown>;

  return {
    claims: claimsSource.map((claim, index) => {
      const c = (typeof claim === "object" && claim !== null ? claim : {}) as Record<string, unknown>;
      return {
        id: String(c.id ?? `c${index + 1}`),
        text: String(c.text ?? c.claim ?? c.statement ?? ""),
        type: normalizeClaimType(c.type),
        confidence: normalizeConfidence(c.confidence),
        reasoning: String(c.reasoning ?? c.explanation ?? ""),
      };
    }),
    connections: connectionsSource.map((conn) => {
      const c = (typeof conn === "object" && conn !== null ? conn : {}) as Record<string, unknown>;
      return {
        from: String(c.from ?? c.source ?? ""),
        to: String(c.to ?? c.target ?? ""),
        label: normalizeConnectionLabel(c.label ?? c.relation),
      };
    }),
    manipulation_score: {
      fear_language: normalizeScore(scoreSource.fear_language ?? scoreSource.fear),
      urgency_bait: normalizeScore(scoreSource.urgency_bait ?? scoreSource.urgency),
      false_equivalence: normalizeScore(scoreSource.false_equivalence ?? scoreSource.equivalence),
      missing_sources: normalizeScore(scoreSource.missing_sources ?? scoreSource.sources),
      emotional_appeals: normalizeScore(scoreSource.emotional_appeals ?? scoreSource.emotional),
    },
    overall_bias: normalizeBias(source.overall_bias ?? source.bias),
    summary: String(source.summary ?? source.overview ?? ""),
  };
}

export type AnalysisPhase =
  | "scrape"
  | "prepare"
  | "ai"
  | "parse"
  | "validate"
  | "db";

export type AnalysisProgressEvent = {
  type: "progress";
  phase: AnalysisPhase;
  status: "started" | "completed" | "retry" | "info";
  message: string;
  timestamp: string;
  attempt?: number;
  code?: string;
  detail?: string;
};

export type AnalysisResultEvent = {
  type: "result";
  id: string;
  result: AnalysisResult;
};

export type AnalysisErrorEvent = {
  type: "error";
  error: string;
  message: string;
  status: number;
  timestamp: string;
  code?: string;
  detail?: string;
  issues?: Array<{
    path: string;
    message: string;
  }>;
};

export type AnalysisStreamEvent =
  | AnalysisProgressEvent
  | AnalysisResultEvent
  | AnalysisErrorEvent;

async function createAnalysisWithRetry(
  data: {
  createdBy: string;
  url: string | null;
  title: string;
  rawText: string;
  result: object;
  },
  onRetry?: (event: AnalysisProgressEvent) => void,
) {
  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.analysis.create({ data });
    } catch (err) {
      lastError = err;
      const normalized = normalizeError(err);
      const code = extractErrorCode(err);

      console.error(
        `[analyse] [db] attempt ${attempt}/${maxAttempts} failed${code ? ` (${code})` : ""}: ${normalized.message}`,
        err,
      );

      // Retry only transient database connectivity failures.
      if (!isTransientDatabaseError(err) || attempt === maxAttempts) {
        throw err;
      }

      onRetry?.({
        type: "progress",
        phase: "db",
        status: "retry",
        message: `Database save attempt ${attempt} failed${code ? ` (${code})` : ""}. Retrying...`,
        timestamp: new Date().toISOString(),
        attempt,
        code: code || undefined,
        detail: normalized.message,
      });

      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError;
}

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

    if (!url && !text?.trim()) {
      return NextResponse.json(
        { error: "no_content", message: "No article content provided." },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: AnalysisStreamEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        const pushProgress = (
          phase: AnalysisPhase,
          status: AnalysisProgressEvent["status"],
          message: string,
          extra: Partial<Omit<AnalysisProgressEvent, "type" | "phase" | "status" | "message" | "timestamp">> = {},
        ) => {
          const event: AnalysisProgressEvent = {
            type: "progress",
            phase,
            status,
            message,
            timestamp: new Date().toISOString(),
            ...extra,
          };

          console.log(`[analyse] [${phase}] ${status}: ${message}`, extra);
          send(event);
        };

        const pushError = (
          status: number,
          error: string,
          message: string,
          extra: Omit<Partial<AnalysisErrorEvent>, "type" | "error" | "message" | "status" | "timestamp"> = {},
        ) => {
          const event: AnalysisErrorEvent = {
            type: "error",
            error,
            message,
            status,
            timestamp: new Date().toISOString(),
            ...extra,
          };

          console.error(`[analyse] [${error}] ${message}`, extra);
          send(event);
        };

        void (async () => {
          let title = "Pasted Article";
          let articleText = text ?? "";

          if (url) {
            pushProgress("scrape", "started", `Scraping article from ${url}`);
            try {
              const extracted = await extractArticle(url);
              title = extracted.title;
              articleText = extracted.text;
              pushProgress(
                "scrape",
                "completed",
                `Scrape complete: \"${title}\" (${articleText.length} chars).`,
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : "";
              if (msg === "scrape_failed") {
                pushError(
                  422,
                  "scrape_failed",
                  "Could not scrape this URL. Paste the article text instead.",
                );
                return;
              }

              throw err;
            }
          } else {
            pushProgress(
              "scrape",
              "completed",
              `Using pasted article text (${articleText.length} chars).`,
            );
          }

          if (!articleText.trim()) {
            pushError(400, "no_content", "No article content provided.");
            return;
          }

          pushProgress("prepare", "started", "Preparing article text for the model.");
          const preparedText = await prepareText(articleText);
          pushProgress(
            "prepare",
            "completed",
            `Prepared ${preparedText.length} characters for AI analysis.`,
          );

          pushProgress("ai", "started", "Requesting analysis from Groq.");

          let raw = "";
          try {
            raw = await callGroq(
              ANALYSE_SYSTEM,
              `Article title: ${title}\n\n${preparedText}`
            );
            pushProgress("ai", "completed", "Received AI response from Groq.");
          } catch (err) {
            const normalized = normalizeError(err);
            if (isNetworkLikeError(normalized.message)) {
              pushError(
                503,
                "ai_unavailable",
                "Could not reach Groq API. Check your network, proxy, or firewall settings and try again.",
                { detail: normalized.message },
              );
              return;
            }

            throw normalized;
          }

          pushProgress("parse", "started", "Parsing AI response.");

          let parsed: unknown;
          try {
            parsed = extractJsonPayload(raw);
            pushProgress("parse", "completed", "Parsed JSON payload from AI response.");
          } catch {
            pushError(500, "parse_failed", "AI returned an invalid response. Please try again.");
            return;
          }

          pushProgress("validate", "started", "Validating analysis schema.");
          const normalizedParsed = normalizeAnalysisPayload(parsed);
          const validated = AnalysisSchema.safeParse(normalizedParsed);
          if (!validated.success) {
            pushError(
              422,
              "schema_invalid",
              "AI response format was invalid, so the analysis could not be saved.",
              {
                issues: validated.error.issues.slice(0, 5).map((issue) => ({
                  path: issue.path.join("."),
                  message: issue.message,
                })),
              },
            );
            return;
          }

          const result = validated.data;
          pushProgress(
            "validate",
            "completed",
            `Validated analysis with ${result.claims.length} claims and ${result.connections.length} connections.`,
          );

          pushProgress("db", "started", "Saving analysis to the database.");

          let analysis;
          try {
            analysis = await createAnalysisWithRetry(
              {
                createdBy: userId,
                url: url ?? null,
                title,
                rawText: articleText.slice(0, 10000),
                result: result as object,
              },
              (event) => send(event),
            );
          } catch (err) {
            const normalized = normalizeError(err);
            const code = extractErrorCode(err);

            if (code === "P2021") {
              pushError(
                500,
                "db_schema_missing",
                "Database table is missing. Run `npx prisma db push` and retry.",
                { code },
              );
              return;
            }

            if (isTransientDatabaseError(err)) {
              const detail =
                code === "ETIMEDOUT" || normalized.message.toLowerCase().includes("etimedout")
                  ? "Database connection timed out. The Neon host is not reachable from this environment. Check WSL/firewall/VPN/network egress settings."
                  : normalized.message;

              pushError(
                503,
                "db_unavailable",
                "Analysis succeeded but saving failed due to a database network issue.",
                {
                  code: code || undefined,
                  detail,
                },
              );
              return;
            }

            throw normalized;
          }

          pushProgress("db", "completed", `Saved analysis ${analysis.id}.`);
          console.log(`[analyse] [done] analysis saved as ${analysis.id}`);
          send({ type: "result", id: analysis.id, result });
        })()
          .catch((err) => {
            const normalized = normalizeError(err);
            console.error("Analysis error:", normalized.message, err);

            const message = normalized.message;
            if (
              message.includes("Groq API key is missing") ||
              message.includes("Could not reach Groq API") ||
              isNetworkLikeError(message)
            ) {
              pushError(
                503,
                "ai_unavailable",
                "Could not reach required services. Please try again.",
                { detail: message },
              );
            } else {
              pushError(
                500,
                "server_error",
                "Something went wrong. Please try again.",
                { detail: message },
              );
            }
          })
          .finally(() => {
            controller.close();
          });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const normalized = normalizeError(err);
    console.error("Analysis error:", normalized.message, err);

    const message = normalized.message;
    if (
      message.includes("Groq API key is missing") ||
      message.includes("Could not reach Groq API") ||
      isNetworkLikeError(message)
    ) {
      return NextResponse.json(
        { error: "ai_unavailable", message: "Could not reach required services. Please try again." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "server_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
