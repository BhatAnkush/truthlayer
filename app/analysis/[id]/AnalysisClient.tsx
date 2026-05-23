"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Link2,
  Share2,
  Check,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import EvidenceBoard from "@/components/EvidenceBoard";
import ManipulationScore from "@/components/ManipulationScore";
import { BorderBeam } from "@/components/magicui/border-beam";
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
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <header className="relative flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <BorderBeam
          size={280}
          duration={10}
          colorFrom="var(--accent)"
          colorTo="transparent"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary"
          >
            <ArrowLeft size={12} />
            TruthLayer
          </Link>
          <h1 className="truncate text-sm font-semibold text-text-primary">
            {title}
          </h1>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate font-mono text-xs text-accent-dim underline hover:text-accent"
            >
              <Link2 size={12} />
              {url}
            </a>
          )}
        </div>
        <button
          onClick={handleShare}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          {copied ? "Copied!" : "Share"}
        </button>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="h-[60vh] border-b border-border md:h-auto md:flex-3 md:border-b-0 md:border-r md:border-border">
          <EvidenceBoard
            claims={result.claims}
            connections={result.connections}
          />
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-5 md:flex-2">
          <div>
            <h2 className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              <ShieldAlert size={13} />
              Manipulation Score
            </h2>
            <ManipulationScore
              score={result.manipulation_score}
              overall_bias={result.overall_bias}
              summary={result.summary}
            />
          </div>

          <div className="border-t border-border-subtle pt-5">
            <h2 className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
              <Workflow size={13} />
              Claims ({result.claims.length})
            </h2>
            <div className="space-y-2">
              {result.claims.map((claim) => (
                <div
                  key={claim.id}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        {
                          fact: "border border-fact bg-fact-bg text-fact",
                          opinion:
                            "border border-opinion bg-opinion-bg text-opinion",
                          fallacy:
                            "border border-fallacy bg-fallacy-bg text-fallacy",
                          missing_context:
                            "border border-missing bg-missing-bg text-missing",
                        }[claim.type]
                      }`}
                    >
                      {claim.type.replace("_", " ")}
                    </span>
                    <span className="font-mono text-[11px] text-text-tertiary">
                      {Math.round(claim.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-text-secondary">
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
