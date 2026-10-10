import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "@/lib/supabase";

export const metadata: Metadata = { title: "Audit log" };

export default function LogPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 text-sm">
      <h1 className="mb-4 text-xl font-semibold">Audit log</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Log />
      </Suspense>
    </main>
  );
}

type Row = {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown>;
  patches: { name: string } | null;
};

function describe(r: Row) {
  const d = r.details;
  switch (r.action) {
    case "published":
      return `v${d.number} (${(d.patches as string[]).join(", ") || "no patches"})`;
    case "rolled_back":
      return `v${d.from ?? "?"} → v${d.to}`;
    default:
      return r.patches?.name ?? (d.name as string) ?? "";
  }
}

// Single-site build: the first (only) site, newest first.
async function Log() {
  await connection();
  const { data: site } = await db.from("sites").select("id").limit(1).maybeSingle();
  if (!site) return <p className="text-red-600">No site found. Seed the sites table first.</p>;

  const { data: rows } = await db
    .from("audit_log")
    .select("id, action, created_at, details, patches(name)")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();

  if (!rows?.length) return <p className="text-zinc-500">Nothing logged yet.</p>;
  return (
    <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
      {rows.map((r) => (
        <li key={r.id} className="flex gap-4 p-3">
          <span className="w-44 shrink-0 text-zinc-500">{new Date(r.created_at).toLocaleString()}</span>
          <span className="w-28 shrink-0 font-medium">{r.action.replace("_", " ")}</span>
          <span className="text-zinc-700">{describe(r)}</span>
        </li>
      ))}
    </ul>
  );
}
