"use client";

import { useEffect, useState } from "react";
import { Outcome } from "@/lib/types";
import OutcomeBadge from "./OutcomeBadge";

const SAMPLE_PAYLOAD = `{"content":[{"type":"text","text":"Error: no rooms available"}],"isError":true}`;
const SESSION_STORAGE_KEY = "silent-signal-session-id";

interface VerdictState {
  toolName: string;
  outcome: Outcome;
  fingerprint: string;
  reason: string;
}

function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const created = `sess_${crypto.randomUUID().slice(0, 8)}`;
  localStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

export default function VerifyForm() {
  const [toolName, setToolName] = useState("manual_test");
  const [sessionId, setSessionId] = useState("");
  const [payload, setPayload] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<VerdictState | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/tool-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, rawPayload: payload, sessionId }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Classification failed");
      }
      setVerdict({
        toolName: body.call.toolName,
        outcome: body.call.outcome,
        fingerprint: body.call.fingerprint,
        reason: body.reason,
      });
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-foreground">
        Paste a tool-call response
      </h1>
      <p className="mt-1 text-sm text-muted">
        Drop in a raw MCP/tool-call JSON payload to see whether it actually
        succeeded.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">Tool name</span>
            <input
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">Session ID</span>
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
        </div>

        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder={SAMPLE_PAYLOAD}
          rows={10}
          spellCheck={false}
          required
          className="w-full rounded-lg border border-border bg-surface p-4 font-mono text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {status === "loading" ? "Classifying…" : "Classify"}
          </button>
          <button
            type="button"
            onClick={() => setPayload(SAMPLE_PAYLOAD)}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Use sample
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {verdict && (
        <div className="mt-8 rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Verdict</h2>
            <OutcomeBadge outcome={verdict.outcome} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted">Tool</dt>
              <dd className="mt-0.5 font-mono text-foreground">
                {verdict.toolName}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Fingerprint</dt>
              <dd className="mt-0.5 font-mono text-foreground">
                {verdict.fingerprint}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <dt className="text-sm text-muted">Why</dt>
            <dd className="mt-0.5 text-sm text-foreground">{verdict.reason}</dd>
          </div>
        </div>
      )}
    </div>
  );
}
