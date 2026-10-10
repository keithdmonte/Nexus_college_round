"use client";

import { useState } from "react";
import { useAction } from "@/app/useAction";
import { MakePermanent } from "@/app/PatchActions";

export function PublishButton({ siteId }: { siteId: string }) {
  const { busy, error, run } = useAction();
  const [note, setNote] = useState("");
  const [unfixed, setUnfixed] = useState<Array<{ id: string; name: string }>>([]);
  const [prompt, setPrompt] = useState<"ask" | "yes" | null>(null);

  async function publish() {
    const data = await run("/api/publish", { site_id: siteId, note });
    if (!data) return;
    setNote("");
    setUnfixed(data.unfixed);
    setPrompt(data.unfixed.length ? "ask" : null);
  }

  return (
    <>
      <input className="input w-56" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button
        onClick={publish}
        disabled={busy}
        className="rounded bg-zinc-900 px-3 py-1.5 font-medium text-white disabled:opacity-40"
      >
        {busy ? "Publishing…" : "Publish"}
      </button>
      {error && <span className="text-red-600">Publish failed: {error}</span>}
      {prompt === "ask" && (
        <div className="flex w-full items-center gap-3 rounded bg-zinc-100 p-3">
          <span className="flex-1">Patch is live. Want me to open a PR to fix this in the code?</span>
          <button onClick={() => setPrompt("yes")} className="rounded bg-zinc-900 px-3 py-1 text-white">Yes</button>
          <button onClick={() => setPrompt(null)} className="rounded border border-zinc-300 px-3 py-1">Not now</button>
        </div>
      )}
      {prompt === "yes" &&
        unfixed.map((p) => (
          <div key={p.id} className="w-full rounded border border-zinc-200 p-3">
            <div className="mb-2 font-medium">{p.name}</div>
            <MakePermanent patchId={p.id} autoStart />
          </div>
        ))}
    </>
  );
}

export function RollbackButton({ versionId, number }: { versionId: string; number: number }) {
  const { busy, error, run } = useAction();
  return (
    <>
      {error && <span className="text-red-600">{error}</span>}
      <button
        onClick={() => run("/api/rollback", { version_id: versionId })}
        disabled={busy}
        className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
      >
        {busy ? "Switching…" : `Make v${number} live`}
      </button>
    </>
  );
}
