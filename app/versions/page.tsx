import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import { workingSet } from "@/lib/workingSet";
import { PublishButton, RollbackButton } from "./Actions";

type VersionItem = {
  id: string;
  number: number;
  note: string | null;
  patches: unknown;
  created_at: string;
};

export default function VersionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Versions &amp; Releases
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Manage frozen patch releases, test preview tokens, and instantly roll back or forward
          without redeploying code.
        </p>
      </div>

      <Suspense fallback={<VersionsLoadingSkeleton />}>
        <VersionsLoader />
      </Suspense>
    </main>
  );
}

function VersionsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-40 rounded-xl bg-white/[0.03]" />
      <div className="h-64 rounded-xl bg-white/[0.03]" />
    </div>
  );
}

async function VersionsLoader() {
  await connection();

  let site: {
    id: string;
    url: string;
    preview_token: string;
    live_version_id: string | null;
  } | null = null;

  let versions: VersionItem[] = [];
  let workingCount = 0;
  let draftNames: string[] = [];
  let isDemo = false;

  try {
    const { data: siteData } = await db
      .from("sites")
      .select("id, url, preview_token, live_version_id")
      .limit(1)
      .maybeSingle();

    if (siteData) {
      site = siteData;

      const [{ data: vData }, { data: wData }, { data: dData }] = await Promise.all([
        db
          .from("versions")
          .select("id, number, note, patches, created_at")
          .eq("site_id", site.id)
          .order("number", { ascending: false }),
        workingSet(site.id),
        db
          .from("patches")
          .select("name")
          .eq("site_id", site.id)
          .eq("status", "draft")
          .order("created_at"),
      ]);

      if (vData) versions = vData as VersionItem[];
      if (wData) workingCount = wData.length;
      if (dData) draftNames = dData.map((d) => d.name);
    } else {
      isDemo = true;
    }
  } catch {
    isDemo = true;
  }

  // Fallback to sample demo preview state if database is not connected
  if (isDemo || !site) {
    site = {
      id: "demo-site-id",
      url: "http://localhost:3000/demo-store",
      preview_token: "a5194d13273c3dde8f086ed5d6bd2b88",
      live_version_id: "demo-v1",
    };
    workingCount = 1;
    draftNames = ["Fix Checkout button"];
    versions = [
      {
        id: "demo-v1",
        number: 1,
        note: "Fix Checkout button & bag drawer",
        patches: [{ name: "Fix Checkout button" }],
        created_at: "2026-10-10T21:42:00.000Z",
      },
      {
        id: "demo-v0",
        number: 0,
        note: "Original site (Initial unpatched release)",
        patches: [],
        created_at: "2026-10-10T20:00:00.000Z",
      },
    ];
  }

  const previewUrl = new URL(site.url);
  previewUrl.searchParams.set("pw_preview", site.preview_token);

  return (
    <div className="flex flex-col gap-6">
      {/* Demo Preview Banner */}
      {isDemo && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3 text-xs"
          style={{
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.22)",
            color: "var(--foreground-subtle)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400" />
            <span>
              <strong className="text-white">Demo Preview — Backend Not Connected:</strong> Displaying
              sample version history for the Northfold Store. Version publishing and live rollbacks
              will activate once Supabase is connected.
            </span>
          </div>
          <span
            className="rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--accent)",
            }}
          >
            Sample History
          </span>
        </div>
      )}

      {/* Working Set Card */}
      <section
        className="rounded-2xl p-6 transition-all"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white">Working Set</h2>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--accent)",
              }}
            >
              {workingCount} ready to publish
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {workingCount} patch(es) will go live in the next release
            {draftNames.length ? (
              <>
                , including <strong className="text-amber-300">{draftNames.length} draft(s)</strong>:{" "}
                <span className="font-mono text-zinc-300">{draftNames.join(", ")}</span>
              </>
            ) : (
              ""
            )}
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PublishButton siteId={site.id} isDemo={isDemo} />
          <a
            href={previewUrl.toString()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.06]"
            style={{
              border: "1px solid var(--border-strong)",
              color: "var(--foreground)",
              background: "var(--surface)",
            }}
          >
            <span>Open preview</span>
            <span className="text-xs">↗</span>
          </a>
        </div>
      </section>

      {/* Versions List Card */}
      <section
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2 className="text-base font-bold text-white">Release History</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Frozen snapshot releases ordered by latest release
            </p>
          </div>
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            {versions.length} release{versions.length === 1 ? "" : "s"} recorded
          </span>
        </div>

        {versions.length > 0 ? (
          <div className="divide-y divide-white/[0.06]">
            {versions.map((v) => {
              const names = Array.isArray(v.patches)
                ? (v.patches as Array<{ name?: string }>).map((p) => p.name).filter(Boolean)
                : [];
              const isLive = v.id === site?.live_version_id;

              return (
                <div
                  key={v.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-white/[0.01]"
                  style={{
                    background: isLive ? "rgba(16, 185, 129, 0.05)" : "transparent",
                    borderLeft: isLive ? "3px solid var(--status-live)" : "3px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-4">
                    {/* Big Monospace Version Number */}
                    <span
                      className="w-16 shrink-0 font-mono text-2xl font-extrabold tracking-tight"
                      style={{ color: isLive ? "var(--status-live)" : "var(--foreground)" }}
                    >
                      v{v.number}
                    </span>

                    {/* Version Metadata */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {v.note ?? (names.length ? names.join(", ") : "Empty release (unpatched)")}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                        <span>{formatDate(v.created_at)}</span>
                        <span>•</span>
                        <span>
                          {names.length} patch{names.length === 1 ? "" : "es"}
                        </span>
                        {isLive && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">Currently serving visitors</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Status Badge or Rollback Button */}
                  <div className="flex items-center gap-3">
                    {isLive ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
                        style={{
                          background: "var(--status-live-bg)",
                          color: "var(--status-live)",
                          border: "1px solid var(--status-live-border)",
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Live Version
                      </span>
                    ) : (
                      <RollbackButton versionId={v.id} number={v.number} isDemo={isDemo} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-sm" style={{ color: "var(--muted)" }}>
            No versions recorded yet. Publish from the working set above.
          </div>
        )}
      </section>
    </div>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
