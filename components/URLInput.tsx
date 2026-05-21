"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

export default function URLInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const didResume = useRef(false);

  const redirectToSignIn = useCallback(
    (pendingUrl: string) => {
      const redirectBack = `/?analyze=${encodeURIComponent(pendingUrl)}`;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(redirectBack)}`);
    },
    [router],
  );

  const analyse = useCallback(
    async (payload: { url?: string; text?: string }) => {
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
          if (res.status === 401 && payload.url) {
            redirectToSignIn(payload.url);
            return;
          }
          if (data.error === "scrape_failed") {
            setMode("text");
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
    },
    [redirectToSignIn, router],
  );

  useEffect(() => {
    const pendingUrl = searchParams.get("analyze")?.trim();

    if (!pendingUrl || !isLoaded || !isSignedIn || didResume.current) {
      return;
    }

    didResume.current = true;
    setMode("url");
    setUrl(pendingUrl);
    void analyse({ url: pendingUrl });
  }, [analyse, isLoaded, isSignedIn, searchParams]);

  function normalizeUrl(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isLoaded) {
      setError("Authentication is still loading. Please wait a moment.");
      return;
    }

    if (mode === "text") {
      const text = pasteText.trim();
      if (!text) return;

      if (!isSignedIn) {
        setError("Please sign in to analyse an article.");
        router.push("/sign-in?redirect_url=%2F");
        return;
      }

      void analyse({ text });
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) return;

    try {
      // Validate early so users get feedback instead of silent form rejection.
      new URL(normalizedUrl);
    } catch {
      setError("Please enter a valid article URL.");
      return;
    }

    if (!isSignedIn) {
      redirectToSignIn(normalizedUrl);
      return;
    }

    void analyse({ url: normalizedUrl });
  }

  const isSubmitDisabled =
    loading || !isLoaded || (mode === "url" ? !url.trim() : !pasteText.trim());

  if (loading) {
    return (
      <div className="w-full max-w-2xl space-y-3">
        <div className="h-12 animate-pulse rounded-lg bg-gray-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-800" />
        <p className="text-center text-sm text-gray-500">
          Analysing article...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-3">
      <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("url");
            setError("");
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "url"
              ? "bg-gray-100 text-gray-900"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          URL
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("text");
            setError("");
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "text"
              ? "bg-gray-100 text-gray-900"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Text
        </button>
      </div>

      {mode === "url" ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white disabled:opacity-50"
            disabled={isSubmitDisabled}
          >
            Analyse URL
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste the article text here..."
            rows={8}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 resize-none"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white disabled:opacity-50"
            disabled={isSubmitDisabled}
          >
            Analyse Text
          </button>
        </div>
      )}

      {error && <p className="text-sm text-amber-400">{error}</p>}
    </form>
  );
}
