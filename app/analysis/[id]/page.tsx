import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
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
  if (!userId) {
    redirect("/");
  }

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({ where: { id } });

  if (!analysis || analysis.createdBy !== userId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <AlertCircle size={28} className="mb-3 text-fallacy" />
        <h1 className="mb-3 text-2xl font-bold text-text-primary">
          Analysis not found
        </h1>
        <p className="mb-6 text-text-secondary">
          This analysis may have been deleted or the link is incorrect.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-bright"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  const result = analysis.result as AnalysisResult;

  return (
    <AnalysisClient
      id={analysis.id}
      title={analysis.title}
      url={analysis.url ?? undefined}
      result={result}
    />
  );
}
