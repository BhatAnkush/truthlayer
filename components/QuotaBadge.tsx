"use client";

import { useEffect, useState } from "react";
import { Gauge, KeyRound } from "lucide-react";

type QuotaResponse = {
  remaining: number;
  exhausted: boolean;
  hasSavedKey: boolean;
};

export default function QuotaBadge() {
  const [data, setData] = useState<QuotaResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/user-quota", { method: "GET" });
        if (!res.ok) return;
        const payload = (await res.json()) as QuotaResponse;
        if (!cancelled) setData(payload);
      } catch {
        // Ignore badge fetch failures.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="rounded-md border border-border px-2 py-1 text-[10px] text-text-tertiary">
        Quota...
      </div>
    );
  }

  const label = data.exhausted
    ? data.hasSavedKey
      ? "Free: Exhausted (saved key)"
      : "Free: Exhausted (key needed)"
    : `Free: ${data.remaining} left`;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium ${
        data.exhausted
          ? "border-opinion bg-opinion-bg text-opinion"
          : "border-fact bg-fact-bg text-fact"
      }`}
      title={label}
      aria-label={label}
    >
      {data.exhausted ? <KeyRound size={12} /> : <Gauge size={12} />}
      <span>{label}</span>
    </div>
  );
}
