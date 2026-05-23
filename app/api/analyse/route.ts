import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { extractArticle } from "@/lib/scraper";
import { prepareText } from "@/lib/chunker";
import { callGroq } from "@/lib/groq";
import { ANALYSE_SYSTEM } from "@/lib/prompts";
import { prisma } from "@/lib/db";
import { decryptStoredKey, encryptStoredKey } from "@/lib/secureKey";

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

function titleFromPastedText(input: string): string {
  const normalized = input
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();

  if (!normalized) {
    return "Pasted Article";
  }

  const words = normalized.split(" ").filter(Boolean);
  const previewWords = words.slice(0, 8).join(" ");
  const needsEllipsis = words.length > 8;
  const preview = `${previewWords}${needsEllipsis ? "..." : ""}`;

  return preview.slice(0, 80);
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

function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isBeforeUtcDay(date: Date, dayStart: Date): boolean {
  return date.getTime() < dayStart.getTime();
}

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
    const { url, text, apiKey, rememberKey } = body as {
      url?: string;
      text?: string;
      apiKey?: string;
      rememberKey?: boolean;
    };

    if (!url && !text?.trim()) {
      return NextResponse.json(
        { error: "no_content", message: "No article content provided." },
        { status: 400 }
      );
    }

    // Cross-user URL cache reuse: if same URL already exists, clone to this user and return immediately.
    if (url) {
      const cached = await prisma.analysis.findFirst({
        where: { url },
        orderBy: { createdAt: "desc" },
      });

      if (cached) {
        let resolved: typeof cached | null = cached;

        if (cached.createdBy !== userId) {
          try {
            resolved = await createAnalysisWithRetry({
              createdBy: userId,
              url: cached.url,
              title: cached.title,
              rawText: cached.rawText,
              result: cached.result as object,
            });
          } catch (err) {
            console.warn(
              "[analyse] cache clone failed; continuing with full analysis",
              err,
            );
            resolved = null;
          }
        }

        if (resolved) {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              const send = (event: AnalysisStreamEvent) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
              };

              send({
                type: "progress",
                phase: "scrape",
                status: "completed",
                message: "Matched existing analysis for this URL.",
                timestamp: new Date().toISOString(),
              });

              send({
                type: "progress",
                phase: "db",
                status: "completed",
                message:
                  cached.createdBy === userId
                    ? "Loaded your cached result."
                    : "Reused cached result and linked it to your account.",
                timestamp: new Date().toISOString(),
              });

              send({
                type: "result",
                id: resolved.id,
                result: resolved.result as AnalysisResult,
              });

              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            },
          });
        }
      }
    }

    const userProvidedApiKey = apiKey?.trim() ? apiKey.trim() : undefined;
    const shouldRememberKey = Boolean(rememberKey);
    const todayStart = startOfUtcDay();
    let effectiveApiKey: string | undefined = userProvidedApiKey;
    let consumeFreeQuotaAfterSuccess = false;
    let useRawQuotaCompletion = false;

    const encryptIfNeeded = (key: string | undefined) => {
      if (!key) return undefined;
      return encryptStoredKey(key);
    };

    const decryptIfNeeded = (key: string | null | undefined) => {
      if (!key) return undefined;
      try {
        return decryptStoredKey(key) ?? undefined;
      } catch {
        return undefined;
      }
    };

    const hasQuotaTable = async () => {
      const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'UserQuota'
        ) AS "exists"
      `;

      return Boolean(rows[0]?.exists);
    };

    const userQuotaModel = (prisma as unknown as {
      userQuota?: {
        findUnique: (args: unknown) => Promise<
          | {
              userId: string;
              quotaDate: Date;
              dailyQuotaDone: boolean;
              storedGroqApiKey: string | null;
            }
          | null
        >;
        create: (args: unknown) => Promise<unknown>;
        update: (args: unknown) => Promise<unknown>;
        updateMany: (args: unknown) => Promise<{ count: number }>;
      };
    }).userQuota;

    if (userQuotaModel) {
      const existingQuota = await userQuotaModel.findUnique({
        where: { userId },
      });

      let quotaState: {
        userId: string;
        quotaDate: Date;
        dailyQuotaDone: boolean;
        storedGroqApiKey: string | null;
      };

      if (!existingQuota) {
        const encrypted = encryptIfNeeded(
          shouldRememberKey ? userProvidedApiKey : undefined,
        );
        await userQuotaModel.create({
          data: {
            userId,
            quotaDate: todayStart,
            dailyQuotaDone: false,
            storedGroqApiKey: encrypted ?? null,
          },
        });

        quotaState = {
          userId,
          quotaDate: todayStart,
          dailyQuotaDone: false,
          storedGroqApiKey: encrypted ?? null,
        };
      } else {
        const needsReset = isBeforeUtcDay(existingQuota.quotaDate, todayStart);
        const nextData: {
          quotaDate?: Date;
          dailyQuotaDone?: boolean;
          storedGroqApiKey?: string;
        } = {};

        if (needsReset) {
          nextData.quotaDate = todayStart;
          nextData.dailyQuotaDone = false;
        }

        if (shouldRememberKey && userProvidedApiKey) {
          nextData.storedGroqApiKey = encryptIfNeeded(userProvidedApiKey);
        }

        if (Object.keys(nextData).length > 0) {
          await userQuotaModel.update({
            where: { userId },
            data: nextData,
          });
        }

        quotaState = {
          userId,
          quotaDate: needsReset ? todayStart : existingQuota.quotaDate,
          dailyQuotaDone: needsReset ? false : existingQuota.dailyQuotaDone,
          storedGroqApiKey: shouldRememberKey && userProvidedApiKey
            ? encryptIfNeeded(userProvidedApiKey) ?? null
            : existingQuota.storedGroqApiKey,
        };
      }

      // If today's free quota is already consumed, automatically use the saved key.
      if (!effectiveApiKey && quotaState.dailyQuotaDone) {
        effectiveApiKey = decryptIfNeeded(quotaState.storedGroqApiKey);
      }

      // If free quota is still available and user did not provide a key, let this run use free quota.
      if (!effectiveApiKey && !quotaState.dailyQuotaDone) {
        consumeFreeQuotaAfterSuccess = true;
      }

      // Daily quota consumed and no usable key available.
      if (!effectiveApiKey && quotaState.dailyQuotaDone) {
        return NextResponse.json(
          {
            error: "user_api_key_required",
            message:
              "Daily free quota is exhausted. Please provide your own Groq API key to continue.",
          },
          { status: 402 },
        );
      }
    } else {
      // Raw SQL fallback path when Prisma client/schema is not yet updated with UserQuota delegate.
      if (await hasQuotaTable()) {
        const rows = await prisma.$queryRaw<
          Array<{
            quotaDate: Date;
            dailyQuotaDone: boolean;
            storedGroqApiKey: string | null;
          }>
        >`
          SELECT
            "quota_date" AS "quotaDate",
            "daily_quota_done" AS "dailyQuotaDone",
            "stored_groq_api_key" AS "storedGroqApiKey"
          FROM "UserQuota"
          WHERE "user_id" = ${userId}
          LIMIT 1
        `;

        let quotaDate = todayStart;
        let dailyQuotaDone = false;
        let storedGroqApiKey: string | null = shouldRememberKey && userProvidedApiKey
          ? encryptIfNeeded(userProvidedApiKey) ?? null
          : null;

        if (rows.length === 0) {
          await prisma.$executeRaw`
            INSERT INTO "UserQuota" (
              "user_id",
              "quota_date",
              "daily_quota_done",
              "stored_groq_api_key",
              "created_at",
              "updated_at"
            ) VALUES (
              ${userId},
              ${todayStart},
              false,
              ${storedGroqApiKey},
              NOW(),
              NOW()
            )
          `;
        } else {
          quotaDate = rows[0].quotaDate;
          dailyQuotaDone = rows[0].dailyQuotaDone;
          storedGroqApiKey = rows[0].storedGroqApiKey;

          const needsReset = isBeforeUtcDay(quotaDate, todayStart);
          if (needsReset) {
            await prisma.$executeRaw`
              UPDATE "UserQuota"
              SET
                "quota_date" = ${todayStart},
                "daily_quota_done" = false,
                "updated_at" = NOW()
              WHERE "user_id" = ${userId}
            `;
            quotaDate = todayStart;
            dailyQuotaDone = false;
          }

          if (shouldRememberKey && userProvidedApiKey) {
            const encrypted = encryptIfNeeded(userProvidedApiKey);
            await prisma.$executeRaw`
              UPDATE "UserQuota"
              SET
                "stored_groq_api_key" = ${encrypted ?? null},
                "updated_at" = NOW()
              WHERE "user_id" = ${userId}
            `;
            storedGroqApiKey = encrypted ?? null;
          }
        }

        if (!effectiveApiKey && dailyQuotaDone) {
          effectiveApiKey = decryptIfNeeded(storedGroqApiKey);
        }

        if (!effectiveApiKey && !dailyQuotaDone) {
          consumeFreeQuotaAfterSuccess = true;
          useRawQuotaCompletion = true;
        }

        if (!effectiveApiKey && dailyQuotaDone) {
          return NextResponse.json(
            {
              error: "user_api_key_required",
              message:
                "Daily free quota is exhausted. Please provide your own Groq API key to continue.",
            },
            { status: 402 },
          );
        }
      } else {
        // Last-resort fallback when table is absent.
        if (!effectiveApiKey) {
          const dailyAnalysisCount = await prisma.analysis.count({
            where: {
              createdBy: userId,
              createdAt: { gte: todayStart },
            },
          });

          if (dailyAnalysisCount >= 1) {
            return NextResponse.json(
              {
                error: "user_api_key_required",
                message:
                  "Daily free quota is exhausted. Please provide your own Groq API key to continue.",
              },
              { status: 402 },
            );
          }

          consumeFreeQuotaAfterSuccess = true;
        }
      }
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
            title = titleFromPastedText(articleText);
            pushProgress(
              "scrape",
              "completed",
              `Using pasted article text (${articleText.length} chars). Title: "${title}".`,
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
              `Article title: ${title}\n\n${preparedText}`,
              effectiveApiKey,
            );
            pushProgress("ai", "completed", "Received AI response from Groq.");
          } catch (err) {
            const normalized = normalizeError(err);
            if (normalized.message === "invalid_user_groq_key") {
              pushError(
                401,
                "invalid_user_groq_key",
                "The provided Groq API key is invalid. Please check it and try again.",
              );
              return;
            }

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

          if (consumeFreeQuotaAfterSuccess && userQuotaModel) {
            await userQuotaModel.updateMany({
              where: {
                userId,
                quotaDate: todayStart,
                dailyQuotaDone: false,
              },
              data: {
                dailyQuotaDone: true,
              },
            });
          } else if (consumeFreeQuotaAfterSuccess && useRawQuotaCompletion) {
            await prisma.$executeRaw`
              UPDATE "UserQuota"
              SET
                "daily_quota_done" = true,
                "updated_at" = NOW()
              WHERE "user_id" = ${userId}
                AND "quota_date" = ${todayStart}
                AND "daily_quota_done" = false
            `;
          }

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
