import { Outcome } from "@/lib/types";

const STYLES: Record<Outcome, string> = {
  SUCCESS:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  TOOL_ERROR: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  EMPTY_RESULT:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  MALFORMED:
    "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  SCHEMA_DRIFT:
    "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
};

export default function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[outcome]}`}
    >
      {outcome.replace("_", " ")}
    </span>
  );
}
