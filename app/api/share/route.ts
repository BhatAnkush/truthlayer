import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendShareEmail } from "@/lib/emails/sendShareEmail";

export const runtime = "nodejs";

type ShareRequestBody = {
  analysisId?: string;
  action?: "toggle_public" | "add_user";
  sharedWithUserId?: string;
};

type DeleteShareRequestBody = {
  analysisId?: string;
  sharedWithUserId?: string;
};

function fullName(firstName: string | null, lastName: string | null): string {
  const value = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return value || "Someone";
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Please sign in to share analyses." },
      { status: 401 },
    );
  }

  let body: ShareRequestBody;
  try {
    body = (await req.json()) as ShareRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const analysisId = typeof body.analysisId === "string" ? body.analysisId : "";
  const action = body.action;

  if (!analysisId || (action !== "toggle_public" && action !== "add_user")) {
    return NextResponse.json(
      { message: "Invalid share request." },
      { status: 400 },
    );
  }

  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, createdBy: userId },
    select: {
      id: true,
      title: true,
    },
  });

  if (!analysis) {
    return NextResponse.json(
      { message: "You are not allowed to modify sharing for this analysis." },
      { status: 403 },
    );
  }

  if (action === "toggle_public") {
    const updatedRows = await prisma.$queryRaw<Array<{ isPublic: boolean }>>`
      UPDATE "Analysis"
      SET "isPublic" = NOT "isPublic"
      WHERE "id" = ${analysis.id}
      RETURNING "isPublic"
    `;

    const updated = updatedRows[0];
    if (!updated) {
      return NextResponse.json(
        { message: "Could not update public sharing." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, isPublic: updated.isPublic });
  }

  const sharedWith =
    typeof body.sharedWithUserId === "string" ? body.sharedWithUserId : "";
  if (!sharedWith) {
    return NextResponse.json(
      { message: "Please choose a user to share with." },
      { status: 400 },
    );
  }

  try {
    const insertedRows = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "AnalysisShare" ("id", "analysisId", "sharedWith", "createdAt")
      VALUES (${randomUUID()}, ${analysis.id}, ${sharedWith}, NOW())
      ON CONFLICT ("analysisId", "sharedWith") DO NOTHING
      RETURNING "id"
    `;

    const wasInserted = insertedRows.length > 0;

    let emailSent = false;

    if (wasInserted) {
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://truthlayer-eight-dusky.vercel.app"
      ).replace(/\/$/, "");
      const appIconUrl = `${appUrl}/lightlogo.svg`;
      const analysisUrl = `${appUrl}/analysis/${analysis.id}`;

      try {
        const client = await clerkClient();
        const [sharer, recipient] = await Promise.all([
          client.users.getUser(userId),
          client.users.getUser(sharedWith),
        ]);

        const recipientEmail = recipient.emailAddresses[0]?.emailAddress ?? "";
        if (recipientEmail) {
          await sendShareEmail({
            recipientEmail,
            recipientName: fullName(recipient.firstName, recipient.lastName),
            sharerName: fullName(sharer.firstName, sharer.lastName),
            sharerImageUrl: sharer.imageUrl ?? undefined,
            articleTitle: analysis.title,
            analysisUrl,
            appUrl,
            appIconUrl,
          });
          emailSent = true;
        }
      } catch {
        return NextResponse.json({ ok: true, emailSent: false });
      }
    }

    return NextResponse.json({ ok: true, emailSent });
  } catch {
    return NextResponse.json(
      { message: "Could not share this analysis right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Please sign in to update shares." },
      { status: 401 },
    );
  }

  let body: DeleteShareRequestBody;
  try {
    body = (await req.json()) as DeleteShareRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  const analysisId = typeof body.analysisId === "string" ? body.analysisId : "";
  const sharedWithUserId =
    typeof body.sharedWithUserId === "string" ? body.sharedWithUserId : "";

  if (!analysisId || !sharedWithUserId) {
    return NextResponse.json(
      { message: "Invalid share removal request." },
      { status: 400 },
    );
  }

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      createdBy: userId,
    },
    select: { id: true },
  });

  if (!analysis) {
    return NextResponse.json(
      { message: "You are not allowed to modify sharing for this analysis." },
      { status: 403 },
    );
  }

  await prisma.$executeRaw`
    DELETE FROM "AnalysisShare"
    WHERE "analysisId" = ${analysis.id}
      AND "sharedWith" = ${sharedWithUserId}
  `;

  return NextResponse.json({ ok: true });
}
