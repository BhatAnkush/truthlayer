import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Globe2,
  LayoutDashboard,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your saved article analyses.",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function hostnameFromUrl(input: string | null): string | null {
  if (!input) return null;
  try {
    return new URL(input).hostname;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const dashboardRows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      url: string | null;
      createdAt: Date;
      isPublic: boolean;
      shareCount: number;
    }>
  >`
    SELECT
      a."id",
      a."title",
      a."url",
      a."createdAt",
      COALESCE(a."isPublic", false) AS "isPublic",
      COUNT(s."id")::int AS "shareCount"
    FROM "Analysis" a
    LEFT JOIN "AnalysisShare" s ON s."analysisId" = a."id"
    WHERE a."created_by" = ${userId}
    GROUP BY a."id"
    ORDER BY a."createdAt" DESC
  `;

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.16em] text-accent-dim">
              <LayoutDashboard size={13} />
              Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-bold text-text-primary sm:text-3xl">
              Your Previous Analyses
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {dashboardRows.length}{" "}
              {dashboardRows.length === 1 ? "analysis" : "analyses"} saved
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
          >
            <Plus size={15} />
            New analysis
          </Link>
        </div>

        {dashboardRows.length === 0 ? (
          <Card className="border-border bg-surface p-8 text-center">
            <h2 className="text-lg font-semibold text-text-primary">
              No analyses yet
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Run your first article analysis and it will show up here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent-bright"
            >
              <Sparkles size={15} />
              Analyze an article
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboardRows.map((analysis) => {
              const hostname = hostnameFromUrl(analysis.url);

              return (
                <Link
                  key={analysis.id}
                  href={`/analysis/${analysis.id}`}
                  className="group relative rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
                >
                  <Card className="h-full border-0 bg-transparent p-0 shadow-none">
                    <div className="flex h-full flex-col">
                      <h2 className="mb-2 line-clamp-2 text-sm font-medium text-text-primary">
                        {analysis.title}
                      </h2>

                      <p className="font-mono text-xs text-text-muted">
                        <CalendarDays size={12} className="mr-1 inline-block" />
                        {formatDate(analysis.createdAt)}
                      </p>

                      {hostname && (
                        <p className="mt-1 truncate font-mono text-xs text-accent-dim">
                          <Globe2 size={12} className="mr-1 inline-block" />
                          {hostname}
                        </p>
                      )}

                      {(analysis.isPublic || analysis.shareCount > 0) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {analysis.isPublic ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-subtle px-2 py-0.5 text-[11px] font-medium text-accent-dim">
                              <Globe2 size={11} />
                              Public
                            </span>
                          ) : null}

                          {analysis.shareCount > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background-subtle px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                              <Users size={11} />
                              {analysis.shareCount}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
