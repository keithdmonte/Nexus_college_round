"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "@/app/useAction";

// pending: there are changes to publish. Stays mounted after publishing so the PR prompt survives the refresh.
export function PublishButton({ siteId, next, previewUrl, pending }: { siteId: string; next: number; previewUrl: string; pending: boolean }) {
  const { busy, error, run } = useAction();
  const router = useRouter();
  const [unfixed, setUnfixed] = useState<Array<{ id: string; name: string }>>([]);
  const [prompt, setPrompt] = useState(false);

  async function publish() {
    const data = await run("/api/publish", { site_id: siteId });
    if (!data) return;
    setUnfixed(data.unfixed);
    setPrompt(data.unfixed.length > 0);
  }

  return (
    <>
      {pending && (
        <>
          <a href={previewUrl} target="_blank" rel="noreferrer" className="text-zinc-300 underline underline-offset-4">
            Preview ↗
          </a>
          <button onClick={publish} disabled={busy} className="btn">
            {busy ? "Publishing…" : `Publish as v${next} →`}
          </button>
        </>
      )}
      {error && <span className="text-red-400">Publish failed: {error}</span>}
      {prompt && (
        <div className="mt-2 flex w-full items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <span className="text-blue-300">✦</span>
          <span className="flex-1 font-medium">Patch is live. Want me to open a PR to fix this in the code?</span>
          <button onClick={() => router.push(`/?permanent=${unfixed.map((p) => p.id).join(",")}`)} className="btn py-1.5">
            Yes
          </button>
          <button onClick={() => setPrompt(false)} className="px-2 text-zinc-500 hover:text-zinc-200">Not now</button>
        </div>
      )}
    </>
  );
}

export function RollbackButton({ versionId }: { versionId: string }) {
  const { busy, error, run } = useAction();
  return (
    <>
      {error && <span className="text-red-400">{error}</span>}
      <button
        onClick={() => run("/api/rollback", { version_id: versionId })}
        disabled={busy}
        className="font-semibold text-zinc-200 underline underline-offset-4 hover:text-white disabled:opacity-40"
      >
        {busy ? "Switching…" : "Use this"}
      </button>
    </>
  );
}
