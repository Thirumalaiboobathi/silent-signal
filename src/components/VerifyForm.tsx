"use client";

import { useState } from "react";
import { MOCK_TOOL_CALLS } from "@/lib/mock-data";
import OutcomeBadge from "./OutcomeBadge";

const SAMPLE_PAYLOAD = `{"content":[{"type":"text","text":"Error: no rooms available"}],"isError":true}`;

export default function VerifyForm() {
  const [payload, setPayload] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Phase 1 placeholder: verdict is a hardcoded mock. Real classifier lands in Phase 2.
  const verdict = MOCK_TOOL_CALLS[1];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
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
        <textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder={SAMPLE_PAYLOAD}
          rows={10}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-surface p-4 font-mono text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 transition-opacity cursor-pointer"
          >
            Classify
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

      {submitted && (
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
            <dd className="mt-0.5 text-sm text-foreground">{verdict.summary}</dd>
          </div>
          <p className="mt-4 text-xs text-muted">
            Placeholder verdict — the deterministic classifier lands in Phase
            2.
          </p>
        </div>
      )}
    </div>
  );
}
