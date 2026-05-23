"use client";

import React from "react";
import { BorderBeam } from "@/components/magicui/border-beam";

export type BiasType = "left" | "right" | "centre" | "unclear";

interface ManipulationScoreData {
  fear_language: number;
  urgency_bait: number;
  false_equivalence: number;
  missing_sources: number;
  emotional_appeals: number;
}

interface ManipulationScoreProps {
  score: ManipulationScoreData;
  overall_bias: BiasType;
  summary: string;
}

const DIMENSIONS: Array<{ key: keyof ManipulationScoreData; label: string }> = [
  { key: "fear_language", label: "Fear Language" },
  { key: "urgency_bait", label: "Urgency Bait" },
  { key: "false_equivalence", label: "False Equivalence" },
  { key: "missing_sources", label: "Missing Sources" },
  { key: "emotional_appeals", label: "Emotional Appeals" },
];

const BIAS_STYLES: Record<BiasType, string> = {
  left: "border-fact bg-fact-bg text-fact",
  right: "border-fallacy bg-fallacy-bg text-fallacy",
  centre: "border-opinion bg-opinion-bg text-opinion",
  unclear: "border-missing bg-missing-bg text-missing",
};

function barColor(value: number): string {
  if (value <= 3) return "bg-fact";
  if (value <= 6) return "bg-opinion";
  return "bg-fallacy";
}

export default function ManipulationScore({
  score,
  overall_bias,
  summary,
}: ManipulationScoreProps) {
  const average =
    (score.fear_language +
      score.urgency_bait +
      score.false_equivalence +
      score.missing_sources +
      score.emotional_appeals) /
    5;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4">
      <BorderBeam
        size={250}
        duration={10}
        colorFrom="var(--accent)"
        colorTo="transparent"
      />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Bias
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${BIAS_STYLES[overall_bias]}`}
            >
              {overall_bias}
            </span>
          </div>
          <span className="font-mono text-2xl font-medium text-accent">
            {average.toFixed(1)}/10
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {DIMENSIONS.map(({ key, label }) => {
            const value = score[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-text-secondary">
                  {label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-background-subtle">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(value)}`}
                    style={{ width: `${value * 10}%` }}
                  />
                </div>
                <span className="w-12 text-right font-mono text-xs text-text-secondary">
                  {value}/10
                </span>
              </div>
            );
          })}
        </div>

        <p className="border-t border-border-subtle pt-3 text-sm italic text-text-secondary">
          {summary}
        </p>
      </div>
    </div>
  );
}
