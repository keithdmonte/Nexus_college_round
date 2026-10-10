import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { summarize } from "@/lib/summarize";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-10 text-sm">
      <h1 className="text-4xl font-extrabold tracking-tight">History</h1>
      <p className="mt-1 mb-8 text-zinc-500">Retired patches: fixed in the code or no longer needed.</p>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Retired />
      </Suspense>
    </main>
  );
}

// Single-site build: the first (only) site's retired patches, most recently retired first.
async function Retired() {
  await connection();
  const { data: site } = await db.from("sites").select("id").limit(1).maybeSingle();
  if (!site) return <p className="text-red-400">No site found. Seed the sites table first.</p>;

  const { data: patches } = await db
    .from("patches")
    .select("id, name, pr_url, changes, created_at, updated_at")
    .eq("site_id", site.id)
    .eq("status", "retired")
    .order("updated_at", { ascending: false });

  if (!patches?.length) return <p className="text-zinc-500">No retired patches yet.</p>;
  return (
    <ul className="space-y-4">
      {patches.map((p) => (
        <li key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-800 text-[11px] font-bold text-blue-300">
              ✓
            </span>
            <p className="flex-1 text-lg font-semibold">{p.name}</p>
            {p.pr_url && (
              <a href={p.pr_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                PR ↗
              </a>
            )}
          </div>
          <p className="mt-3 font-mono text-xs text-zinc-500">{summarize(p.changes)}</p>
          <p className="mt-3 text-zinc-600">
            Created {new Date(p.created_at).toLocaleString()} · Retired {new Date(p.updated_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
