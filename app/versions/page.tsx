import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { workingSet } from "@/lib/workingSet";
import { PublishButton, RollbackButton } from "./Actions";

export const metadata: Metadata = { title: "Publish" };

export default function VersionsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-10 text-sm">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight">Publish</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Versions />
      </Suspense>
    </main>
  );
}

type Frozen = { id: string; name: string };

// Single-site build: the first (only) site.
async function Versions() {
  await connection();
  const { data: site } = await db
    .from("sites")
    .select("id, url, preview_token, live_version_id")
    .limit(1)
    .maybeSingle();
  if (!site) return <p className="text-red-400">No site found. Seed the sites table first.</p>;

  const [{ data: versions }, { data: working }] = await Promise.all([
    db.from("versions").select("id, number, note, patches, created_at").eq("site_id", site.id).order("number", { ascending: false }),
    workingSet(site.id),
  ]);

  const previewUrl = new URL(site.url);
  previewUrl.searchParams.set("pw_preview", site.preview_token);
  const live = versions?.find((v) => v.id === site.live_version_id);
  const liveSet = (live?.patches ?? []) as Frozen[];

  // What Publish would change: working set vs the live snapshot (both hold the same patch fields, so compare as JSON).
  const frozen = new Map(liveSet.map((p) => [p.id, JSON.stringify(p)]));
  const pending = [
    ...(working ?? []).filter((p) => frozen.get(p.id) !== JSON.stringify(p)).map((p) => `${p.name} (${frozen.has(p.id) ? "edited" : "new"})`),
    ...liveSet.filter((p) => !working?.some((w) => w.id === p.id)).map((p) => `${p.name} (removed)`),
  ];

  // Earlier versions to go back to: newest first, skipping any that would read the same as live or a newer one.
  const label = (set: Frozen[]) => (set.length ? set.map((p) => p.name).join(", ") : "Original site, no fixes");
  const seen = new Set([label(liveSet)]);
  const earlier = (versions ?? []).filter((v) => {
    const key = label(v.patches as Frozen[]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Live now</p>
        <p className="mt-1 text-lg font-semibold">
          {label(liveSet)}
        </p>
      </section>

      {pending.length > 0 && (
        <section className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-6">
          <p className="text-xs uppercase tracking-widest text-blue-300">Not live yet</p>
          <p className="mt-1 text-lg font-semibold">{pending.join(", ")}</p>
        </section>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PublishButton siteId={site.id} previewUrl={previewUrl.toString()} pending={pending.length > 0} />
      </div>

      {earlier.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer text-zinc-400 hover:text-zinc-200">Go back to an earlier version</summary>
          <ul className="mt-3 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
            {earlier.map((v) => (
              <li key={v.id} className="flex items-center gap-4 px-5 py-3">
                <span className="flex-1 text-zinc-300">{label(v.patches as Frozen[])}</span>
                <RollbackButton versionId={v.id} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
