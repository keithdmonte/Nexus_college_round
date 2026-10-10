"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "@/app/useAction";

type Edit = { file: string; find: string; replace: string };
type Proposal = { summary: string; edits: Edit[]; searched: string[] };

// Patch to PR: Claude proposes source edits, the user reviews the diff, confirm opens the PR.
export function MakePermanent({ patchId, prUrl, autoStart }: { patchId: string; prUrl?: string | null; autoStart?: boolean }) {
  const { busy, error, run } = useAction();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [opened, setOpened] = useState(prUrl ?? null);

  async function propose() {
    setProposal(await run("/api/pr", { patch_id: patchId, action: "propose" }));
  }
  async function open() {
    if (!proposal) return;
    const data = await run("/api/pr", { patch_id: patchId, action: "open", edits: proposal.edits, summary: proposal.summary });
    if (data) {
      setOpened(data.pr_url);
      setProposal(null);
    }
  }

  // Ref guard: dev StrictMode runs effects twice, which would call Claude twice.
  const started = useRef(false);
  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    propose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (opened)
    return (
      <a href={opened} target="_blank" rel="noreferrer" className="underline">
        View PR ↗
      </a>
    );

  return (
    <div className="flex w-full flex-col gap-2">
      {!proposal && (
        <div className="flex items-center gap-3">
          <button onClick={propose} disabled={busy} className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40">
            {busy ? "Finding files and writing the fix…" : "Make it permanent"}
          </button>
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}
      {proposal && (
        <>
          <p>
            <span className="font-medium">{proposal.summary}</span>
            <span className="text-zinc-500"> · searched {proposal.searched.join(", ")}</span>
          </p>
          {proposal.edits.map((e, i) => (
            <div key={i} className="overflow-hidden rounded border border-zinc-200 font-mono text-xs">
              <div className="bg-zinc-100 px-2 py-1">{e.file}</div>
              <pre className="whitespace-pre-wrap break-all bg-red-50 px-2 py-1 text-red-800">{prefix("- ", e.find)}</pre>
              <pre className="whitespace-pre-wrap break-all bg-green-50 px-2 py-1 text-green-800">{prefix("+ ", e.replace)}</pre>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button onClick={open} disabled={busy} className="rounded bg-zinc-900 px-3 py-1.5 font-medium text-white disabled:opacity-40">
              {busy ? "Opening PR…" : "Open PR"}
            </button>
            <button onClick={() => setProposal(null)} disabled={busy} className="rounded border border-zinc-300 px-3 py-1">
              Cancel
            </button>
            {error && <span className="text-red-600">{error}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function prefix(mark: string, text: string) {
  return text.split("\n").map((l) => mark + l).join("\n");
}

export function RetireButton({ patchId }: { patchId: string }) {
  const { busy, error, run } = useAction();
  return (
    <>
      {error && <span className="text-red-600">{error}</span>}
      <button onClick={() => run("/api/patches", { id: patchId }, "DELETE")} disabled={busy} className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40">
        {busy ? "Retiring…" : "Retire patch"}
      </button>
    </>
  );
}
