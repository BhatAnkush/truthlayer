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
  { bg: string; border: string; text: string; label: string }
> = {
  fact: {
    bg: "var(--fact-bg)",
    border: "var(--fact)",
    text: "var(--fact)",
    label: "Fact",
  },
  opinion: {
    bg: "var(--opinion-bg)",
    border: "var(--opinion)",
    text: "var(--opinion)",
    label: "Opinion",
  },
  fallacy: {
    bg: "var(--fallacy-bg)",
    border: "var(--fallacy)",
    text: "var(--fallacy)",
    label: "Fallacy",
  },
  missing_context: {
    bg: "var(--missing-bg)",
    border: "var(--missing)",
    text: "var(--missing)",
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
            className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: style.bg,
              color: style.text,
              border: `1px solid ${style.border}`,
            }}
          >
            {style.label}
          </span>
          <span className="font-mono text-[11px] text-text-tertiary">
            {Math.round(claim.confidence * 100)}%
          </span>
        </div>
        <p className="line-clamp-3 text-xs leading-snug text-text-primary">
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
