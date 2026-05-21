"use client";

import React from "react";

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
  left: "bg-blue-900 text-blue-200 border border-blue-700",
  right: "bg-red-900 text-red-200 border border-red-700",
  centre: "bg-gray-700 text-gray-200 border border-gray-600",
  unclear: "bg-gray-800 text-gray-300 border border-gray-600",
};

function barColor(value: number): string {
  if (value <= 3) return "bg-emerald-500";
  if (value <= 6) return "bg-amber-500";
  return "bg-red-500";
}

export default function ManipulationScore({
  score,
  overall_bias,
  summary,
}: ManipulationScoreProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Bias
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${BIAS_STYLES[overall_bias]}`}
        >
          {overall_bias}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {DIMENSIONS.map(({ key, label }) => {
          const value = score[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-36 shrink-0 text-xs text-gray-400">
                {label}
              </span>
              <div className="flex-1 rounded-full bg-gray-800 h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(value)}`}
                  style={{ width: `${value * 10}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs font-mono text-gray-400">
                {value}/10
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-sm italic text-gray-400 border-t border-gray-800 pt-3">
        {summary}
      </p>
    </div>
  );
}
