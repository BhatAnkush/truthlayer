import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { encryptStoredKey } from "@/lib/secureKey";

export const runtime = "nodejs";

function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Please sign in." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "invalid_api_key", message: "Groq API key is required." },
      { status: 400 },
    );
  }

  const userQuotaModel = (prisma as unknown as {
    userQuota?: {
      upsert: (args: unknown) => Promise<unknown>;
    };
  }).userQuota;

  let encryptedKey = "";
  try {
    encryptedKey = encryptStoredKey(apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "encryption_secret_missing") {
      return NextResponse.json(
        {
          error: "encryption_secret_missing",
          message:
            "Server encryption secret is missing. Set GROQ_KEY_ENCRYPTION_SECRET.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "encrypt_failed", message: "Could not encrypt API key." },
      { status: 500 },
    );
  }

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

  const todayStart = startOfUtcDay();

  if (userQuotaModel) {
    await userQuotaModel.upsert({
      where: { userId },
      create: {
        userId,
        quotaDate: todayStart,
        dailyQuotaDone: false,
        storedGroqApiKey: encryptedKey,
      },
      update: {
        storedGroqApiKey: encryptedKey,
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (!(await hasQuotaTable())) {
    return NextResponse.json(
      {
        error: "quota_table_unavailable",
        message:
          "Quota table is not available yet. Run prisma db push and prisma generate.",
      },
      { status: 503 },
    );
  }

  await prisma.$executeRaw`
    INSERT INTO "UserQuota" (
      "user_id",
      "quota_date",
      "daily_quota_done",
      "stored_groq_api_key",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${userId},
      ${todayStart},
      false,
      ${encryptedKey},
      NOW(),
      NOW()
    )
    ON CONFLICT ("user_id")
    DO UPDATE SET
      "stored_groq_api_key" = EXCLUDED."stored_groq_api_key",
      "updated_at" = NOW()
  `;

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Please sign in." },
      { status: 401 },
    );
  }

  const todayStart = startOfUtcDay();

  const userQuotaModel = (prisma as unknown as {
    userQuota?: {
      findUnique: (args: unknown) => Promise<
        | {
            quotaDate: Date;
            dailyQuotaDone: boolean;
            storedGroqApiKey: string | null;
          }
        | null
      >;
    };
  }).userQuota;

  if (userQuotaModel) {
    const row = await userQuotaModel.findUnique({ where: { userId } });
    const exhausted = Boolean(
      row && row.quotaDate.getTime() >= todayStart.getTime() && row.dailyQuotaDone,
    );

    return NextResponse.json({
      remaining: exhausted ? 0 : 1,
      exhausted,
      hasSavedKey: Boolean(row?.storedGroqApiKey),
    });
  }

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

  if (rows.length > 0) {
    const row = rows[0];
    const exhausted =
      row.quotaDate.getTime() >= todayStart.getTime() && row.dailyQuotaDone;
    return NextResponse.json({
      remaining: exhausted ? 0 : 1,
      exhausted,
      hasSavedKey: Boolean(row.storedGroqApiKey),
    });
  }

  const todayCount = await prisma.analysis.count({
    where: {
      createdBy: userId,
      createdAt: { gte: todayStart },
    },
  });

  const exhausted = todayCount >= 1;
  return NextResponse.json({
    remaining: exhausted ? 0 : 1,
    exhausted,
    hasSavedKey: false,
  });
}
