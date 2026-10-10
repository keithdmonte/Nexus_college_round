import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { MakePermanent, RetireButton } from "./PatchActions";

// Minimal home until the Phase 5 dashboard cleanup.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 text-sm text-zinc-900">
      <h1 className="mb-4 text-xl font-semibold">PATCHWORK</h1>
      <ul className="mb-6 flex gap-4 underline">
        <li><Link href="/editor">Editor</Link></li>
        <li><Link href="/versions">Versions</Link></li>
        <li><Link href="/log">Audit log</Link></li>
      </ul>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Patches />
      </Suspense>
    </main>
  );
}

// Single-site build: the first (only) site's non-retired patches.
async function Patches() {
  await connection();
  const { data: site } = await db.from("sites").select("id").limit(1).maybeSingle();
  if (!site) return <p className="text-red-600">No site found. Seed the sites table first.</p>;

  const { data: patches } = await db
    .from("patches")
    .select("id, name, status, pr_url")
    .eq("site_id", site.id)
    .neq("status", "retired")
    .order("created_at");
  if (!patches?.length) return <p className="text-zinc-500">No patches yet.</p>;

  return (
    <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
      {patches.map((p) => (
        <li key={p.id} className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-3">
            <span className="flex-1 font-medium">{p.name}</span>
            <span className="text-xs text-zinc-500">{p.status}</span>
            <RetireButton patchId={p.id} />
          </div>
          <MakePermanent patchId={p.id} prUrl={p.pr_url} />
        </li>
      ))}
    </ul>
  );
}
