"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";

export type ClaimType = "fact" | "opinion" | "fallacy" | "missing_context";

export interface Claim {
  id: string;
  text: string;
  type: ClaimType;
  confidence: number;
  reasoning: string;
}

const TYPE_STYLES: Record<
  ClaimType,
  { bg: string; border: string; badge: string; label: string }
> = {
  fact: {
    bg: "#E1F5EE",
    border: "#0F6E56",
    badge: "bg-teal-100 text-teal-800",
    label: "Fact",
  },
  opinion: {
    bg: "#FAEEDA",
    border: "#854F0B",
    badge: "bg-amber-100 text-amber-800",
    label: "Opinion",
  },
  fallacy: {
    bg: "#FAECE7",
    border: "#993C1D",
    badge: "bg-red-100 text-red-800",
    label: "Fallacy",
  },
  missing_context: {
    bg: "#F1EFE8",
    border: "#5F5E5A",
    badge: "bg-stone-100 text-stone-700",
    label: "Missing Context",
  },
};

interface ClaimNodeData {
  claim: Claim;
  onSelect: (claim: Claim) => void;
}

function ClaimNode({ data }: NodeProps<ClaimNodeData>) {
  const { claim, onSelect } = data;
  const style = TYPE_STYLES[claim.type];

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        className="cursor-pointer rounded-lg p-3 shadow-sm transition-shadow hover:shadow-md"
        style={{
          background: style.bg,
          border: `2px solid ${style.border}`,
          width: 240,
          minHeight: 80,
        }}
        onClick={() => onSelect(claim)}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
          >
            {style.label}
          </span>
          <span className="text-[11px] text-gray-500">
            {Math.round(claim.confidence * 100)}%
          </span>
        </div>
        <p className="text-xs leading-snug text-gray-800 line-clamp-3">
          {claim.text.length > 100
            ? claim.text.slice(0, 100) + "…"
            : claim.text}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default memo(ClaimNode);
