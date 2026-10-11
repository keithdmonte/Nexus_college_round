"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MakePermanentButton, ProposalView, RetireButton, usePermanent } from "./PatchActions";

export type CardPatch = {
  id: string;
  name: string;
  summary: string;
  prUrl: string | null;
  liveNumber: number | null; // live version number if this patch is in it
  status: string;
};

const STEPS = ["Draft", "Preview", "Live", "PR", "Retired"];

// One patch as a pipeline: Draft → Preview → Live → PR → Retired, next action at the current step.
// autoStart: arrived from the post-publish "open a PR?" prompt, so start the proposal right away.
export default function PatchCard({ patch, previewUrl, autoStart }: { patch: CardPatch; previewUrl: string; autoStart?: boolean }) {
  const p = usePermanent(patch.id, patch.prUrl, autoStart && !patch.prUrl);
  const router = useRouter();
  useEffect(() => {
    if (autoStart) router.replace("/", { scroll: false });
  }, [autoStart, router]);
  const current = patch.prUrl ? 4 : patch.liveNumber !== null ? 3 : patch.status === "published" ? 2 : 1;

  function action(i: number) {
    if (i === 1)
      return (
        <a href={previewUrl} target="_blank" rel="noreferrer" className="btn px-3 py-1.5">
          Preview ↗
        </a>
      );
    if (i === 2)
      return (
        <Link href="/versions" className="btn px-3 py-1.5">
          Make live →
        </Link>
      );
    if (i === 3) return <MakePermanentButton p={p} />;
    return <RetireButton patchId={patch.id} label="Merged? Retire →" primary />;
  }

  function label(i: number) {
    if (i === 2 && patch.liveNumber !== null) return `Live v${patch.liveNumber}`;
    // Preview isn't recorded, so a draft can go straight on to Publish (on the Publish page).
    if (i === 2 && current === 1)
      return (
        <Link href="/versions" className="btn-ghost">
          Publish →
        </Link>
      );
    if (i === 3 && patch.prUrl)
      return (
        <a href={patch.prUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          PR ↗
        </a>
      );
    return STEPS[i];
  }

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center gap-4">
        <p className="flex-1 text-lg font-semibold">{patch.name}</p>
        <span className="font-mono text-xs text-zinc-500">{patch.summary}</span>
        {current < 4 && <RetireButton patchId={patch.id} />}
      </div>
      <ol className="mt-5 flex items-center gap-3 text-sm">
        {STEPS.map((_, i) => (
          <li key={i} className={`flex items-center gap-3 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
            <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
              <Dot i={i} current={current} />
              {i === current ? action(i) : <span className={i > current ? "text-zinc-600" : ""}>{label(i)}</span>}
            </span>
            {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 ${i < current ? "bg-accent/50" : "bg-zinc-800"}`} />}
          </li>
        ))}
      </ol>
      {(p.proposal || p.error) && (
        <div className="mt-5 border-t border-zinc-800 pt-5">
          <ProposalView p={p} />
        </div>
      )}
    </li>
  );
}

function Dot({ i, current }: { i: number; current: number }) {
  const base = "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold";
  if (i < current) return <span className={`${base} border border-zinc-700 bg-zinc-800 text-blue-300`}>✓</span>;
  if (i === current) return <span className={`${base} bg-accent text-white ring-4 ring-accent/25`}>{i + 1}</span>;
  return <span className={`${base} border border-dashed border-zinc-700 text-zinc-600`}>{i + 1}</span>;
}
