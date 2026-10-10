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
      <p className="mt-1 mb-8 text-zinc-500">Every publish is a snapshot. Any snapshot can go live again in one click.</p>
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
  if (!site) return <p className="text-red-400">No site found. Seed the sites table first.</p>;

  const [{ data: versions }, { data: working }, { data: drafts }] = await Promise.all([
    db.from("versions").select("id, number, note, patches, created_at").eq("site_id", site.id).order("number", { ascending: false }),
    workingSet(site.id),
    db.from("patches").select("name").eq("site_id", site.id).eq("status", "draft").order("created_at"),
  ]);

  const previewUrl = new URL(site.url);
  previewUrl.searchParams.set("pw_preview", site.preview_token);

  const next = (versions?.[0]?.number ?? -1) + 1;

  return (
    <>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Ready to ship</p>
        <p className="mt-1 mb-4 text-lg font-semibold">
          {working?.length ?? 0} patch(es) would go live
          {drafts?.length ? `, including ${drafts.length} draft(s): ${drafts.map((d) => d.name).join(", ")}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <PublishButton siteId={site.id} next={next} previewUrl={previewUrl.toString()} />
        </div>
      </section>

      <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {versions?.map((v) => {
          const names = (v.patches as Array<{ name: string }>).map((p) => p.name);
          const live = v.id === site.live_version_id;
          return (
            <li
              key={v.id}
              className={`flex flex-col rounded-xl border p-5 ${live ? "border-accent/50 bg-accent/10" : "border-zinc-800"}`}
            >
              <p className={`text-3xl font-extrabold ${live ? "text-blue-300" : "text-zinc-600"}`}>v{v.number}</p>
              {live && <p className="mt-1 text-xs font-bold text-blue-300">● LIVE NOW</p>}
              <p className="mt-3 flex-1 text-zinc-300">{v.note ?? (names.length ? names.join(", ") : "No patches")}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {new Date(v.created_at).toLocaleString()} · {names.length} patch(es)
              </p>
              {!live && (
                <div className="mt-3">
                  <RollbackButton versionId={v.id} number={v.number} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
