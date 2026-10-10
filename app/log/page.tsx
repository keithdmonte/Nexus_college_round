import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { db } from "@/lib/supabase";

export const metadata: Metadata = { title: "Audit log" };

export default function LogPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-10 text-sm">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight">Audit log</h1>
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

const icons: Record<string, string> = {
  created: "+",
  edited: "✎",
  published: "↑",
  rolled_back: "↺",
  pr_opened: "PR",
  retired: "✓",
  reported_broken: "!",
};

const labels: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  published: "Published",
  rolled_back: "Rolled back",
  pr_opened: "PR opened",
  retired: "Retired",
  reported_broken: "Reported broken",
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
  if (!site) return <p className="text-red-400">No site found. Seed the sites table first.</p>;

  const { data: rows } = await db
    .from("audit_log")
    .select("id, action, created_at, details, patches(name)")
    .eq("site_id", site.id)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Row[]>();

  if (!rows?.length) return <p className="text-zinc-500">Nothing logged yet.</p>;
  return (
    <ul className="relative space-y-5 pl-10">
      <span className="absolute top-1 bottom-1 left-[11px] w-px bg-zinc-800" />
      {rows.map((r) => (
        <li key={r.id} className="relative flex items-baseline gap-2">
          <span
            className={`absolute -left-10 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
              r.action === "published" ? "bg-accent text-white" : "border border-zinc-700 bg-zinc-900 text-blue-300"
            }`}
          >
            {icons[r.action] ?? "•"}
          </span>
          <span className="font-semibold">{labels[r.action] ?? r.action.replace("_", " ")}</span>
          <span className="text-zinc-400">· {describe(r)}</span>
          <span className="ml-2 text-zinc-600">{new Date(r.created_at).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
