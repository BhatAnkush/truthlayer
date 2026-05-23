import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const analyses = await prisma.analysis.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      url: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
              Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Your Previous Analyses
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} saved
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500 hover:text-white"
          >
            + New analysis
          </Link>
        </div>

        {analyses.length === 0 ? (
          <Card className="border-gray-800 bg-gray-900 p-8 text-center">
            <h2 className="text-lg font-semibold text-white">No analyses yet</h2>
            <p className="mt-2 text-sm text-gray-400">
              Run your first article analysis and it will show up here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-white"
            >
              Analyze an article
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {analyses.map((analysis) => (
              <Link key={analysis.id} href={`/analysis/${analysis.id}`}>
                <Card className="h-full border-gray-800 bg-gray-900 p-5 transition-all hover:-translate-y-0.5 hover:border-gray-600 hover:bg-gray-900/95">
                  <div className="flex h-full flex-col">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {formatDate(analysis.createdAt)}
                    </p>

                    <h2 className="mt-2 line-clamp-2 text-base font-semibold text-white">
                      {analysis.title}
                    </h2>

                    <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                      {analysis.url ?? "No source URL saved"}
                    </p>

                    <span className="mt-5 inline-flex text-sm font-medium text-gray-300">
                      Open analysis
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}