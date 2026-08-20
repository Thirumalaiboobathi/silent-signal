import { MOCK_THRASH_WINDOWS } from "@/lib/mock-data";

export default function Thrash() {
  const windows = MOCK_THRASH_WINDOWS;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Thrash windows
        </h1>
        <p className="mt-1 text-sm text-muted">
          Same tool, same args, 3+ calls within 60 seconds on one session —
          usually an agent stuck in a retry loop.
        </p>
      </div>

      {windows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
          No thrash detected.
        </div>
      ) : (
        <div className="space-y-4">
          {windows.map((w) => (
            <div
              key={w.id}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-foreground">
                  {w.toolName}
                </span>
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                  {w.count}× in window
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Session</dt>
                  <dd className="mt-0.5 font-mono text-xs text-foreground">
                    {w.sessionId}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Args hash</dt>
                  <dd className="mt-0.5 font-mono text-xs text-foreground">
                    {w.argsHash}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Window start</dt>
                  <dd className="mt-0.5 text-xs text-foreground">
                    {new Date(w.windowStart).toLocaleTimeString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Window end</dt>
                  <dd className="mt-0.5 text-xs text-foreground">
                    {new Date(w.windowEnd).toLocaleTimeString()}
                  </dd>
                </div>
              </dl>
              <div className="mt-4">
                <dt className="text-xs text-muted">Call IDs</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {w.callIds.map((id) => (
                    <span
                      key={id}
                      className="rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-muted"
                    >
                      {id}
                    </span>
                  ))}
                </dd>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
