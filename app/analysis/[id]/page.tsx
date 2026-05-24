import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import type { AnalysisResult } from "@/app/api/analyse/route";
import AnalysisClient from "./AnalysisClient";

export const metadata: Metadata = {
  title: "Analysis",
  description: "Detailed claim-level analysis for an article.",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnalysisPage({ params }: Props) {
  const { userId } = await auth();
  const { id } = await params;
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      url: string | null;
      result: unknown;
      createdBy: string | null;
      isPublic: boolean;
      sharedWithIds: string[];
    }>
  >`
    SELECT
      a."id",
      a."title",
      a."url",
      a."result",
      a."created_by" AS "createdBy",
      COALESCE(a."isPublic", false) AS "isPublic",
      COALESCE(ARRAY_REMOVE(ARRAY_AGG(s."sharedWith"), NULL), ARRAY[]::text[]) AS "sharedWithIds"
    FROM "Analysis" a
    LEFT JOIN "AnalysisShare" s ON s."analysisId" = a."id"
    WHERE a."id" = ${id}
    GROUP BY a."id"
    LIMIT 1
  `;

  const analysis = rows[0];

  if (!analysis) {
    redirect("/");
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-text-primary sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background-subtle px-3 py-1 text-xs font-medium text-text-secondary">
              <Lock size={12} />
              Detailed view is locked
            </div>

            <h1 className="mb-2 text-2xl font-semibold text-text-primary sm:text-3xl">
              Sign in to view this analysis
            </h1>
            <p className="mb-6 max-w-2xl text-sm text-text-secondary">
              This shared link is available, but detailed insights are hidden
              until you sign in.
            </p>

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background-subtle p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-text-tertiary">
                  Article
                </p>
                <p className="blur-[3px] select-none text-sm font-medium text-text-primary">
                  {analysis.title}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background-subtle p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-text-tertiary">
                  Insights
                </p>
                <p className="blur-[3px] select-none text-sm text-text-secondary">
                  Claim graph, manipulation score, and claim-level reasoning are
                  hidden.
                </p>
              </div>
            </div>

            <Link
              href={`/sign-in?redirect_url=/analysis/${analysis.id}`}
              className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-bright"
            >
              Sign in to view details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = analysis.createdBy === userId;
  const isPublic = analysis.isPublic;
  const isShared = Boolean(userId) && analysis.sharedWithIds.includes(userId);

  if (!isOwner && !isPublic && !isShared) {
    redirect("/");
  }

  const result = analysis.result as AnalysisResult;

  return (
    <AnalysisClient
      id={analysis.id}
      title={analysis.title}
      url={analysis.url ?? undefined}
      result={result}
      isOwner={isOwner}
      isPublic={analysis.isPublic}
      initialSharedWith={analysis.sharedWithIds}
    />
  );
}
