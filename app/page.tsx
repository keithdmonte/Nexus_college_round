import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import PatchCard from "./PatchCard";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-5xl p-10 text-sm">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Patches</h1>
          <p className="mt-1 text-zinc-500">Fixes running in your visitors&apos; browsers.</p>
        </div>
        <Link href="/editor" className="btn">
          + New patch
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Patches searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type Change =
  | { type: "text"; value: string }
  | { type: "style"; props: Record<string, string> }
  | { type: "hide" }
  | { type: "attribute"; name: string; value: string };

// Short, readable list of what a patch changes, e.g. `color → var(--on-accent) · + data-checkout`.
function summarize(changes: Change[]) {
  return changes
    .flatMap((c) => {
      if (c.type === "text") return [`text → "${c.value}"`];
      if (c.type === "style") return Object.entries(c.props).map(([k, v]) => `${k} → ${v}`);
      if (c.type === "hide") return ["hide"];
      return [`+ ${c.name}${c.value ? `="${c.value}"` : ""}`];
    })
    .join(" · ");
}

// Single-site build: the first (only) site's non-retired patches.
async function Patches({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  await connection();
  const { permanent } = await searchParams;
  const autoStart = new Set(typeof permanent === "string" ? permanent.split(",") : []);
  const { data: site } = await db.from("sites").select("id, url, preview_token, live_version_id").limit(1).maybeSingle();
  if (!site) return <p className="text-red-400">No site found. Seed the sites table first.</p>;

  const [{ data: patches }, { data: live }] = await Promise.all([
    db
      .from("patches")
      .select("id, name, status, pr_url, changes")
      .eq("site_id", site.id)
      .neq("status", "retired")
      .order("created_at"),
    site.live_version_id
      ? db.from("versions").select("number, patches").eq("id", site.live_version_id).maybeSingle()
      : { data: null },
  ]);
  if (!patches?.length)
    return (
      <p className="text-zinc-500">
        No patches yet.{" "}
        <Link href="/editor" className="text-blue-300 underline underline-offset-4">
          Open the editor
        </Link>{" "}
        to create one.
      </p>
    );

  const liveIds = new Set(((live?.patches ?? []) as Array<{ id: string }>).map((p) => p.id));
  const previewUrl = new URL(site.url);
  previewUrl.searchParams.set("pw_preview", site.preview_token);

  return (
    <ul className="space-y-4">
      {patches.map((p) => (
        <PatchCard
          key={p.id}
          previewUrl={previewUrl.toString()}
          autoStart={autoStart.has(p.id)}
          patch={{
            id: p.id,
            name: p.name,
            status: p.status,
            prUrl: p.pr_url,
            summary: summarize(p.changes as Change[]),
            liveNumber: live && liveIds.has(p.id) ? live.number : null,
          }}
        />
      ))}
    </ul>
  );
}
