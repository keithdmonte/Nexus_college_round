"use client";

import { useAction } from "@/app/useAction";

// Undo a merged code fix: opens a revert PR on GitHub. Once opened, links to it instead.
export default function RevertButton({ patchId, revertUrl }: { patchId: string; revertUrl: string | null }) {
  const { busy, error, run } = useAction();
  if (revertUrl)
    return (
      <a href={revertUrl} target="_blank" rel="noreferrer" className="whitespace-nowrap underline underline-offset-4">
        Revert PR ↗
      </a>
    );
  return (
    <span className="flex flex-col items-end gap-2">
      <button onClick={() => run("/api/revert", { patch_id: patchId })} disabled={busy} className="btn-ghost whitespace-nowrap">
        {busy ? "Opening revert PR…" : "Revert in code →"}
      </button>
      {error && <span className="max-w-md text-right text-red-400">{error}</span>}
    </span>
  );
}
