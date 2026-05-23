"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  Suspense,
} from "react";
import { FileText, Link2, Save, Search, ScanSearch } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  AnalysisProgressEvent,
  AnalysisStreamEvent,
} from "@/app/api/analyse/route";

const PROGRESS_STYLE: Record<AnalysisProgressEvent["status"], string> = {
  started: "border-border bg-surface-raised text-text-primary",
  completed: "border-fact bg-fact-bg text-fact",
  retry: "border-opinion bg-opinion-bg text-opinion",
  info: "border-border bg-surface text-text-secondary",
};

function ProgressPanel({ progress }: { progress: AnalysisProgressEvent[] }) {
  return (
    <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 text-left shadow-2xl shadow-black/15">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-text-tertiary">
            Live Analysis Log
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            Processing article
          </h2>
        </div>
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
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
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-tertiary">
                {event.status}
              </p>
            </div>
            <p className="mt-1 text-sm leading-relaxed">{event.message}</p>
            {event.detail && (
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                {event.detail}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-text-tertiary">
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
  const [groqApiKey, setGroqApiKey] = useState("");
  const [requiresOwnKey, setRequiresOwnKey] = useState(false);
  const [rememberKey, setRememberKey] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [saveError, setSaveError] = useState("");
  const didResume = useRef(false);

  const redirectToSignIn = useCallback(
    (pendingUrl: string) => {
      const redirectBack = `/?analyze=${encodeURIComponent(pendingUrl)}`;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(redirectBack)}`);
    },
    [router],
  );

  const analyse = useCallback(
    async (payload: {
      url?: string;
      text?: string;
      apiKey?: string;
      rememberKey?: boolean;
    }) => {
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
          if (data.error === "user_api_key_required") {
            setRequiresOwnKey(true);
            setError(
              data.message ?? "Please provide your Groq API key to continue.",
            );
            return;
          }

          if (data.error === "invalid_user_groq_key") {
            setRequiresOwnKey(true);
            setError(data.message ?? "Invalid Groq API key.");
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
          setError(
            "Analysis finished without a saved result. Please try again.",
          );
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

  async function handleSaveKey() {
    const key = groqApiKey.trim();
    if (!key) {
      setSaveError("Enter your Groq API key first.");
      return;
    }

    setSaveError("");
    setSaveState("saving");
    try {
      const res = await fetch("/api/user-quota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: key }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.message ?? "Could not save API key.");
        setSaveState("idle");
        return;
      }

      setSaveState("saved");
    } catch {
      setSaveError("Network error while saving key.");
      setSaveState("idle");
    }
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
      void analyse({
        text,
        apiKey: groqApiKey.trim() || undefined,
        rememberKey,
      });
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

    void analyse({
      url: normalizedUrl,
      apiKey: groqApiKey.trim() || undefined,
      rememberKey,
    });
  }

  const isSubmitDisabled =
    loading || !isLoaded || (mode === "url" ? !url.trim() : !pasteText.trim());

  if (loading) {
    return <ProgressPanel progress={progress} />;
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="inline-flex rounded-lg border border-border bg-background-subtle p-1">
          <button
            type="button"
            onClick={() => {
              setMode("url");
              setError("");
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "url"
                ? "bg-surface text-text-primary"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Link2 size={12} />
              URL
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("text");
              setError("");
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "text"
                ? "bg-surface text-text-primary"
                : "text-text-tertiary hover:text-text-primary"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <FileText size={12} />
              Text
            </span>
          </button>
        </div>

        {mode === "url" ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              required
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-accent-bright disabled:opacity-50"
              disabled={isSubmitDisabled}
            >
              <Search size={14} />
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
              className="w-full resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-accent-bright disabled:opacity-50"
              disabled={isSubmitDisabled}
            >
              <ScanSearch size={14} />
              Analyse Text
            </button>
          </div>
        )}

        {(requiresOwnKey || groqApiKey.trim().length > 0) && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary">
              Groq API key
            </label>
            <input
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              autoComplete="off"
            />
            <label className="mt-1 inline-flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={rememberKey}
                onChange={(e) => setRememberKey(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border bg-background text-accent"
              />
              Save this key for later use
            </label>
            <button
              type="button"
              onClick={() => void handleSaveKey()}
              disabled={saveState === "saving" || !groqApiKey.trim()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={12} />
              {saveState === "saving"
                ? "Saving..."
                : saveState === "saved"
                  ? "Saved"
                  : "Save for later"}
            </button>
            <p className="text-xs text-text-tertiary">
              One free analysis per day is included. After that, your own Groq
              API key is required.
            </p>
            {saveError && <p className="text-xs text-fallacy">{saveError}</p>}
          </div>
        )}

        {error && <p className="text-sm text-fallacy">{error}</p>}
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
