import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { workingSet } from "@/lib/workingSet";
import { PublishButton, RollbackButton } from "./Actions";

export const metadata: Metadata = { title: "Versions" };

export default function VersionsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-10 text-sm">
      <h1 className="text-4xl font-extrabold tracking-tight">Versions</h1>
      <p className="mt-1 mb-8 text-zinc-500">What visitors see now, and every earlier version.</p>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Versions />
      </Suspense>
    </main>
  );
}

type Frozen = { id: string; name: string };

const fixes = (n: number) => (n === 0 ? "no fixes" : n === 1 ? "1 fix" : `${n} fixes`);

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
  const next = (versions?.[0]?.number ?? -1) + 1;
  const live = versions?.find((v) => v.id === site.live_version_id);
  const liveSet = (live?.patches ?? []) as Frozen[];

  // What Publish would change: working set vs the live snapshot (both hold the same patch fields, so compare as JSON).
  const frozen = new Map(liveSet.map((p) => [p.id, JSON.stringify(p)]));
  const pending = [
    ...(working ?? []).filter((p) => frozen.get(p.id) !== JSON.stringify(p)).map((p) => `${p.name} (${frozen.has(p.id) ? "edited" : "new"})`),
    ...liveSet.filter((p) => !working?.some((w) => w.id === p.id)).map((p) => `${p.name} (removed)`),
  ];

  return (
    <>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-lg font-semibold">
          Visitors see: {live ? `v${live.number} · ${fixes(liveSet.length)}` : "the original site"}
        </p>
        {liveSet.length > 0 && <p className="mt-1 text-zinc-400">{liveSet.map((p) => p.name).join(", ")}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-5">
          {pending.length ? (
            <p className="w-full text-zinc-300">
              {pending.length} change(s) not live yet: {pending.join(", ")}
            </p>
          ) : (
            <p className="text-zinc-400">
              <span className="text-blue-300">✓</span> Everything is live. Nothing to publish.
            </p>
          )}
          <PublishButton siteId={site.id} next={next} previewUrl={previewUrl.toString()} pending={pending.length > 0} />
        </div>
      </section>

      <div className="mt-10 mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Past versions</h2>
        <p className="text-zinc-500">Switch visitors to any of them in one click.</p>
      </div>
      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {versions?.map((v) => {
          const names = (v.patches as Frozen[]).map((p) => p.name);
          const isLive = v.id === site.live_version_id;
          return (
            <li key={v.id} className={`flex items-center gap-4 px-5 py-3 ${isLive ? "bg-accent/10" : ""}`}>
              <span className={`w-10 font-bold ${isLive ? "text-blue-300" : "text-zinc-500"}`}>v{v.number}</span>
              <span className="flex-1 text-zinc-300">{v.note ?? (names.length ? names.join(", ") : "No fixes")}</span>
              <span className="text-xs text-zinc-600">{new Date(v.created_at).toLocaleString()}</span>
              <span className="w-20 text-right">
                {isLive ? <span className="text-xs font-bold text-blue-300">● LIVE</span> : <RollbackButton versionId={v.id} />}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
