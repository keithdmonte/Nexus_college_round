import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { MakePermanent, RetireButton } from "./PatchActions";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 text-sm">
      <h1 className="mb-4 text-xl font-semibold">Patches</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Patches />
      </Suspense>
    </main>
  );
}

const badge: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800",
};

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
  if (!patches?.length)
    return (
      <p className="text-zinc-500">
        No patches yet. <Link href="/editor" className="underline">Open the editor</Link> to create one.
      </p>
    );

  return (
    <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
      {patches.map((p) => (
        <li key={p.id} className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-3">
            <span className="flex-1 font-medium">{p.name}</span>
            <span className={`rounded px-2 py-1 text-xs font-medium ${badge[p.status] ?? "bg-zinc-100 text-zinc-700"}`}>{p.status}</span>
            <RetireButton patchId={p.id} />
          </div>
          <MakePermanent patchId={p.id} prUrl={p.pr_url} />
        </li>
      ))}
    </ul>
  );
}
