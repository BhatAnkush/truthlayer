import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/db";
import type { AnalysisResult } from "@/app/api/analyse/route";
import AnalysisClient from "./AnalysisClient";

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center">
        <h1 className="mb-3 text-2xl font-bold text-white">
          Analysis not found
        </h1>
        <p className="mb-6 text-gray-400">
          This analysis may have been deleted or the link is incorrect.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-white"
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
