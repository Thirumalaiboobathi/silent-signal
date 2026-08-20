import OutcomeBadge from "@/components/OutcomeBadge";
import { fingerprintFrequency, silentFailureCount } from "@/lib/derive";
import { listToolCalls } from "@/lib/tool-calls";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const calls = await listToolCalls();
  const failures = silentFailureCount(calls);
  const fingerprints = fingerprintFrequency(calls);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Recent tool calls and where they&apos;re quietly going wrong.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total calls" value={calls.length} />
        <StatCard
          label="Silent failures"
          value={failures}
          accent="text-red-500 dark:text-red-400"
        />
        <StatCard label="Distinct fingerprints" value={fingerprints.length} />
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted">Recent calls</h2>
        {calls.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Outcome</th>
                  <th className="px-4 py-3 font-medium">Fingerprint</th>
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface-raised">
                {calls.map((call) => (
                  <tr key={call.id}>
                    <td className="px-4 py-3 font-mono text-foreground">
                      {call.toolName}
                    </td>
                    <td className="px-4 py-3">
                      <OutcomeBadge outcome={call.outcome} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {call.fingerprint}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {call.sessionId}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(call.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {fingerprints.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted">
            Fingerprints by frequency
          </h2>
          <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface-raised">
            {fingerprints.map((fp) => (
              <div
                key={fp.fingerprint}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">
                    {fp.fingerprint}
                  </span>
                  <span className="font-mono text-sm text-foreground">
                    {fp.toolName}
                  </span>
                  <OutcomeBadge outcome={fp.outcome} />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {fp.count}×
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-3 rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted">
      No calls yet — paste a payload on the Verify page to get started.
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${accent ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
