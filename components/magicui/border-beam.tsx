"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type BorderBeamProps = {
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
};

export function BorderBeam({
  size = 260,
  duration = 10,
  colorFrom = "var(--accent)",
  colorTo = "transparent",
  className,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]",
        className,
      )}
    >
      <div
        className="absolute left-1/2 top-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 animate-border-beam"
        style={
          {
            width: size,
            animationDuration: `${duration}s`,
            background: `conic-gradient(from 0deg, ${colorTo}, ${colorFrom}, ${colorTo})`,
            maskImage:
              "radial-gradient(transparent calc(100% - 2px), black calc(100% - 1px))",
            WebkitMaskImage:
              "radial-gradient(transparent calc(100% - 2px), black calc(100% - 1px))",
          } as React.CSSProperties
        }
      />
    </div>
  );
}
