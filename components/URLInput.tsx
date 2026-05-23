"use client";

import React, { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AnalysisProgressEvent,
  AnalysisStreamEvent,
} from "@/app/api/analyse/route";

const PROGRESS_STYLE: Record<AnalysisProgressEvent["status"], string> = {
  started: "border-sky-800 bg-sky-950/40 text-sky-200",
  completed: "border-emerald-800 bg-emerald-950/40 text-emerald-200",
  retry: "border-amber-800 bg-amber-950/40 text-amber-200",
  info: "border-gray-700 bg-gray-900 text-gray-300",
};

function ProgressPanel({ progress }: { progress: AnalysisProgressEvent[] }) {
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-950/80 p-5 text-left shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-800 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            Live Analysis Log
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-100">
            Processing article
          </h2>
        </div>
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {progress.map((event, index) => (
          <div
            key={`${event.timestamp}-${event.phase}-${index}`}
            className={`rounded-xl border px-4 py-3 ${PROGRESS_STYLE[event.status]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium capitalize">
                {event.phase.replace("_", " ")}
              </p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">
                {event.status}
              </p>
            </div>
            <p className="mt-1 text-sm leading-relaxed">{event.message}</p>
            {event.detail && (
              <p className="mt-2 text-xs leading-relaxed text-gray-400">
                {event.detail}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Server logs for the same steps are being written to the terminal.
      </p>
    </div>
  );
}

// Inner component that uses useSearchParams — must be inside Suspense
function URLInputInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const [mode, setMode] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<AnalysisProgressEvent[]>([]);
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
      setProgress([
        {
          type: "progress",
          phase: "prepare",
          status: "info",
          message: "Submitting analysis request...",
          timestamp: new Date().toISOString(),
        },
      ]);

      try {
        const res = await fetch("/api/analyse", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get("content-type") ?? "";

        if (!res.ok || !contentType.includes("text/event-stream")) {
          const data = await res.json();

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

        const reader = res.body?.getReader();
        if (!reader) {
          setError("Could not read analysis progress from the server.");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let nextAnalysisId = "";
        let streamError = "";

        const handleEvent = (event: AnalysisStreamEvent) => {
          if (event.type === "progress") {
            setProgress((current) => [...current, event]);
            return;
          }

          if (event.type === "error") {
            if (event.error === "scrape_failed") {
              setMode("text");
            }
            streamError = event.message;
            if (event.detail) {
              streamError = `${event.message} (${event.detail})`;
            }
            return;
          }

          nextAnalysisId = event.id;
        };

        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value ?? new Uint8Array(), {
            stream: !done,
          });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const dataLines = chunk
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .join("\n");

            if (!dataLines) continue;

            handleEvent(JSON.parse(dataLines) as AnalysisStreamEvent);
          }

          if (done) break;
        }

        if (streamError) {
          setError(streamError);
          return;
        }

        if (!nextAnalysisId) {
          setError("Analysis finished without a saved result. Please try again.");
          return;
        }

        router.push(`/analysis/${nextAnalysisId}`);
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
    if (!pendingUrl || !isLoaded || !isSignedIn || didResume.current) return;
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
    return <ProgressPanel progress={progress} />;
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-1">
          <button
            type="button"
            onClick={() => { setMode("url"); setError(""); }}
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
            onClick={() => { setMode("text"); setError(""); }}
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

      {progress.length > 0 && <ProgressPanel progress={progress} />}
    </div>
  );
}

// Exported component wraps the inner one in Suspense
export default function URLInput() {
  return (
    <Suspense fallback={null}>
      <URLInputInner />
    </Suspense>
  );
}