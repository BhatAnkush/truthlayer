"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function URLInput() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyse(payload: { url?: string; text?: string }) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "scrape_failed") {
          setShowPaste(true);
          setError(
            "We couldn't scrape that URL. Paste the article text below.",
          );
          return;
        }
        setError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(`/analysis/${data.id}`);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (showPaste) {
      if (!pasteText.trim()) return;
      analyse({ text: pasteText });
    } else {
      if (!url.trim()) return;
      analyse({ url: url.trim() });
    }
  }

  if (loading) {
    return (
      <div className="w-full max-w-2xl space-y-3">
        <div className="h-12 animate-pulse rounded-lg bg-gray-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-800" />
        <p className="text-center text-sm text-gray-500">Analysing article…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-3">
      {!showPaste ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white disabled:opacity-50"
            disabled={!url.trim()}
          >
            Analyse
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste the article text here…"
            rows={8}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white disabled:opacity-50"
              disabled={!pasteText.trim()}
            >
              Analyse Text
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPaste(false);
                setError("");
              }}
              className="rounded-lg border border-gray-700 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-amber-400">{error}</p>}
    </form>
  );
}
