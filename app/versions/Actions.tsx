"use client";

import { useState } from "react";
import { useAction } from "@/app/useAction";
import { MakePermanent } from "@/app/PatchActions";

export function PublishButton({ siteId, next, previewUrl }: { siteId: string; next: number; previewUrl: string }) {
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
      <a href={previewUrl} target="_blank" rel="noreferrer" className="text-zinc-300 underline underline-offset-4">
        Preview ↗
      </a>
      <input className="input w-56" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button onClick={publish} disabled={busy} className="btn">
        {busy ? "Publishing…" : `Publish v${next} →`}
      </button>
      {error && <span className="text-red-400">Publish failed: {error}</span>}
      {prompt === "ask" && (
        <div className="mt-2 flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <span className="text-blue-300">✦</span>
          <span className="flex-1 font-medium">Patch is live. Want me to open a PR to fix this in the code?</span>
          <button onClick={() => setPrompt("yes")} className="btn py-1.5">Yes</button>
          <button onClick={() => setPrompt(null)} className="px-2 text-zinc-500 hover:text-zinc-200">Not now</button>
        </div>
      )}
      {prompt === "yes" &&
        unfixed.map((p) => (
          <div key={p.id} className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 font-semibold">{p.name}</div>
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
      {error && <span className="text-red-400">{error}</span>}
      <button
        onClick={() => run("/api/rollback", { version_id: versionId })}
        disabled={busy}
        className="font-semibold text-zinc-200 underline underline-offset-4 hover:text-white disabled:opacity-40"
      >
        {busy ? "Switching…" : `Make v${number} live`}
      </button>
    </>
  );
}
