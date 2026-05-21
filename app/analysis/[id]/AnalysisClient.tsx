"use client";

import React, { useState } from "react";
import Link from "next/link";
import EvidenceBoard from "@/components/EvidenceBoard";
import ManipulationScore from "@/components/ManipulationScore";
import type { AnalysisResult } from "@/app/api/analyse/route";

interface Props {
  id: string;
  title: string;
  url?: string;
  result: AnalysisResult;
}

export default function AnalysisClient({ id, title, url, result }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — silently fail
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-4 border-b border-gray-800 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-300">
            ← TruthLayer
          </Link>
          <h1 className="truncate text-sm font-semibold text-gray-100">
            {title}
          </h1>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs text-gray-500 hover:text-gray-300 underline"
            >
              {url}
            </a>
          )}
        </div>
        <button
          onClick={handleShare}
          className="shrink-0 rounded-lg border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-gray-100"
        >
          {copied ? "Copied!" : "Share"}
        </button>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Evidence Board — 60% */}
        <div className="h-[60vh] md:h-auto md:flex-3 border-b border-gray-800 md:border-b-0 md:border-r md:border-gray-800">
          <EvidenceBoard
            claims={result.claims}
            connections={result.connections}
          />
        </div>

        {/* Score panel — 40% */}
        <div className="flex flex-col gap-6 overflow-y-auto p-5 md:flex-2">
          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Manipulation Score
            </h2>
            <ManipulationScore
              score={result.manipulation_score}
              overall_bias={result.overall_bias}
              summary={result.summary}
            />
          </div>

          <div className="border-t border-gray-800 pt-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
              Claims ({result.claims.length})
            </h2>
            <div className="space-y-2">
              {result.claims.map((claim) => (
                <div
                  key={claim.id}
                  className="rounded-lg border border-gray-800 bg-gray-900 p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        {
                          fact: "bg-teal-900 text-teal-300",
                          opinion: "bg-amber-900 text-amber-300",
                          fallacy: "bg-red-900 text-red-300",
                          missing_context: "bg-stone-800 text-stone-300",
                        }[claim.type]
                      }`}
                    >
                      {claim.type.replace("_", " ")}
                    </span>
                    <span className="text-[11px] text-gray-600">
                      {Math.round(claim.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-300">
                    {claim.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
