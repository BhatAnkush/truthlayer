import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

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
        storedGroqApiKey: apiKey,
      },
      update: {
        storedGroqApiKey: apiKey,
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
      ${apiKey},
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
