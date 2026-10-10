import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { workingSet } from "@/lib/workingSet";
import { PublishButton, RollbackButton } from "./Actions";

export default function VersionsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 text-sm text-zinc-900">
      <h1 className="mb-4 text-xl font-semibold">
        <Link href="/" className="text-zinc-400">PATCHWORK</Link> / Versions
      </h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <Versions />
      </Suspense>
    </main>
  );
}

// Single-site build: the first (only) site.
async function Versions() {
  await connection();
  const { data: site } = await db
    .from("sites")
    .select("id, url, preview_token, live_version_id")
    .limit(1)
    .maybeSingle();
  if (!site) return <p className="text-red-600">No site found. Seed the sites table first.</p>;

  const [{ data: versions }, { data: working }, { data: drafts }] = await Promise.all([
    db.from("versions").select("id, number, note, patches, created_at").eq("site_id", site.id).order("number", { ascending: false }),
    workingSet(site.id),
    db.from("patches").select("name").eq("site_id", site.id).eq("status", "draft").order("created_at"),
  ]);

  const previewUrl = new URL(site.url);
  previewUrl.searchParams.set("pw_preview", site.preview_token);

  return (
    <>
      <section className="mb-6 rounded border border-zinc-200 p-4">
        <h2 className="mb-1 font-semibold">Working set</h2>
        <p className="mb-3 text-zinc-600">
          {working?.length ?? 0} patch(es) would go live
          {drafts?.length ? `, including ${drafts.length} draft(s): ${drafts.map((d) => d.name).join(", ")}` : ""}.
        </p>
        <div className="flex items-center gap-3">
          <PublishButton siteId={site.id} />
          <a href={previewUrl.toString()} target="_blank" rel="noreferrer" className="underline">
            Open preview
          </a>
        </div>
      </section>

      <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
        {versions?.map((v) => {
          const names = (v.patches as Array<{ name: string }>).map((p) => p.name);
          const live = v.id === site.live_version_id;
          return (
            <li key={v.id} className="flex items-center gap-4 p-3">
              <span className="w-10 font-mono font-semibold">v{v.number}</span>
              <div className="flex-1">
                <div>{v.note ?? (names.length ? names.join(", ") : "No patches")}</div>
                <div className="text-xs text-zinc-500">
                  {new Date(v.created_at).toLocaleString()} · {names.length} patch(es)
                </div>
              </div>
              {live ? (
                <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Live</span>
              ) : (
                <RollbackButton versionId={v.id} number={v.number} />
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
