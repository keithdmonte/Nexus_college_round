"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "@/app/useAction";

type Edit = { file: string; find: string; replace: string };
type Proposal = { summary: string; edits: Edit[]; searched: string[] };

// Patch to PR: Claude proposes source edits, the user reviews the diff, confirm opens the PR.
export function usePermanent(patchId: string, prUrl?: string | null, autoStart?: boolean) {
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

  return { busy, error, proposal, opened, propose, open, cancel: () => setProposal(null) };
}

export type Permanent = ReturnType<typeof usePermanent>;

export function MakePermanentButton({ p }: { p: Permanent }) {
  if (p.proposal) return <span className="text-zinc-400">Review the fix below</span>;
  return (
    <button onClick={p.propose} disabled={p.busy} className="btn px-3 py-1.5">
      {p.busy ? "Finding files and writing the fix…" : "Make it permanent →"}
    </button>
  );
}

// Proposed diff with Open PR / Cancel. Renders nothing until there is a proposal.
export function ProposalView({ p }: { p: Permanent }) {
  if (!p.proposal) return p.error ? <p className="text-red-400">{p.error}</p> : null;
  return (
    <div className="flex w-full flex-col gap-3">
      <p>
        <span className="font-medium">{p.proposal.summary}</span>
        <span className="text-zinc-500"> · searched {p.proposal.searched.join(", ")}</span>
      </p>
      {p.proposal.edits.map((e, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-zinc-800 font-mono text-xs">
          <div className="bg-zinc-900 px-3 py-1.5 text-zinc-400">{e.file}</div>
          <pre className="whitespace-pre-wrap break-all bg-red-950/40 px-3 py-1.5 text-red-300">{prefix("- ", e.find)}</pre>
          <pre className="whitespace-pre-wrap break-all bg-green-950/40 px-3 py-1.5 text-green-300">{prefix("+ ", e.replace)}</pre>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={p.open} disabled={p.busy} className="btn">
          {p.busy ? "Opening PR…" : "Open PR"}
        </button>
        <button onClick={p.cancel} disabled={p.busy} className="btn-ghost">
          Cancel
        </button>
        {p.error && <span className="text-red-400">{p.error}</span>}
      </div>
    </div>
  );
}

// Button + diff in one block, used by the post-publish prompt on /versions.
export function MakePermanent({ patchId, autoStart }: { patchId: string; autoStart?: boolean }) {
  const p = usePermanent(patchId, null, autoStart);
  if (p.opened)
    return (
      <a href={p.opened} target="_blank" rel="noreferrer" className="text-blue-300 underline underline-offset-4">
        View PR ↗
      </a>
    );
  return (
    <div className="flex flex-col gap-3">
      {!p.proposal && (
        <div className="flex items-center gap-3">
          <MakePermanentButton p={p} />
          {p.error && <span className="text-red-400">{p.error}</span>}
        </div>
      )}
      {p.proposal && <ProposalView p={p} />}
    </div>
  );
}

function prefix(mark: string, text: string) {
  return text.split("\n").map((l) => mark + l).join("\n");
}

export function RetireButton({ patchId, label = "Retire", primary }: { patchId: string; label?: string; primary?: boolean }) {
  const { busy, error, run } = useAction();
  return (
    <>
      {error && <span className="text-red-400">{error}</span>}
      <button onClick={() => run("/api/patches", { id: patchId }, "DELETE")} disabled={busy} className={primary ? "btn px-3 py-1.5" : "text-zinc-500 hover:text-zinc-200 disabled:opacity-40"}>
        {busy ? "Retiring…" : label}
      </button>
    </>
  );
}
