import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import StatusBadge from "./components/StatusBadge";
import { SnippetCopy } from "./components/SnippetCopy";

type PatchTarget = {
  tag?: string;
  text?: string | null;
  classes?: string[];
  selector?: string;
};

type Patch = {
  id: string;
  name: string;
  page?: string;
  target?: PatchTarget | null;
  changes?: unknown;
  status: "draft" | "published" | "retired" | "broken";
  last_broken_at?: string | null;
  pr_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Site = {
  id: string;
  name: string;
  url: string;
  site_key: string;
  preview_token: string;
  live_version_id?: string | null;
  live_version_number?: number | null;
  created_at?: string;
};

type AuditLogRow = {
  id: string;
  action: string;
  created_at: string;
  details?: Record<string, unknown>;
  patch_name?: string | null;
};

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<DashboardLoadingSkeleton />}>
        <DashboardLoader />
      </Suspense>
    </main>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-28 rounded-2xl bg-white/[0.03]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-white/[0.03]" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-white/[0.03]" />
    </div>
  );
}

async function DashboardLoader() {
  await connection();

  let site: Site | null = null;
  let patches: Patch[] = [];
  let liveVersionNumber: number | null = null;
  let recentActivity: AuditLogRow | null = null;
  let isDemoMode = false;

  try {
    const { data: siteData } = await db
      .from("sites")
      .select("id, name, url, site_key, preview_token, live_version_id, created_at")
      .limit(1)
      .maybeSingle();

    if (siteData) {
      site = siteData;

      const [patchesRes, liveVerRes, logsRes] = await Promise.all([
        db
          .from("patches")
          .select("*")
          .eq("site_id", site.id)
          .order("updated_at", { ascending: false }),
        site.live_version_id
          ? db
              .from("versions")
              .select("number")
              .eq("id", site.live_version_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        db
          .from("audit_log")
          .select("id, action, created_at, details, patches(name)")
          .eq("site_id", site.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      patches = (patchesRes.data as Patch[]) || [];
      if (liveVerRes.data) {
        liveVersionNumber = liveVerRes.data.number;
      }
      if (logsRes.data) {
        const logData = logsRes.data as unknown as {
          id: string;
          action: string;
          created_at: string;
          details?: Record<string, unknown>;
          patches?: { name: string } | { name: string }[] | null;
        };
        const patchName = Array.isArray(logData.patches)
          ? logData.patches[0]?.name
          : logData.patches?.name;
        recentActivity = {
          id: logData.id,
          action: logData.action,
          created_at: logData.created_at,
          details: logData.details,
          patch_name: patchName ?? null,
        };
      }
    } else {
      isDemoMode = true;
    }
  } catch {
    isDemoMode = true;
  }

  // If database credentials are not yet provisioned, provide clear demo preview data
  if (isDemoMode || !site) {
    site = {
      id: "demo-site",
      name: "Northfold Store",
      url: "http://localhost:5500",
      site_key: "pw_live_northfold_demo",
      preview_token: "preview_northfold_token",
      live_version_id: "demo-v1",
      live_version_number: 1,
    };
    liveVersionNumber = 1;
    patches = [
      {
        id: "demo-patch-1",
        name: "Fix Checkout button",
        page: "*",
        target: {
          tag: "button",
          text: "Checkout",
          classes: ["btn", "btn-accent"],
          selector: "aside.drawer div.totals > button",
        },
        changes: [
          { type: "style", props: { color: "var(--on-accent)" } },
          { type: "attribute", name: "data-checkout", value: "" },
        ],
        status: "published",
        last_broken_at: null,
        pr_url: "https://github.com/keithdmonte/northfold_store/pull/1",
        updated_at: "2026-10-10T21:42:00.000Z",
      },
      {
        id: "demo-patch-2",
        name: "Hide promo banner",
        page: "*",
        target: {
          tag: "div",
          text: "Sale",
          classes: ["top-banner"],
          selector: "header div.top-banner",
        },
        changes: [{ type: "hide" }],
        status: "draft",
        last_broken_at: null,
        pr_url: null,
        updated_at: "2026-10-10T21:10:00.000Z",
      },
      {
        id: "demo-patch-3",
        name: "Update order summary badge",
        page: "*",
        target: {
          tag: "span",
          text: "Cart",
          classes: ["badge"],
          selector: "header button.bag-btn span.badge",
        },
        changes: [{ type: "style", props: { fontSize: "12px" } }],
        status: "published",
        last_broken_at: "2026-10-10T19:40:00.000Z",
        pr_url: null,
        updated_at: "2026-10-10T19:00:00.000Z",
      },
    ];
    recentActivity = {
      id: "demo-log-1",
      action: "published",
      created_at: "2026-10-10T21:42:00.000Z",
      details: { number: 1, patches: ["Fix Checkout button"] },
    };
  }

  const totalPatches = patches.length;
  const draftPatches = patches.filter((p) => p.status === "draft").length;
  const publishedPatches = patches.filter((p) => p.status === "published").length;

  return (
    <div className="flex flex-col gap-8">
      {/* Backend connection status notice if running in demo preview mode */}
      {isDemoMode && (
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
              <strong className="text-white">Sample Preview Mode:</strong> Backend database
              credentials pending from teammate. Displaying preview data for the Northfold Store.
            </span>
          </div>
          <span
            className="rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--accent)",
            }}
          >
            Demo View
          </span>
        </div>
      )}

      {/* Hero Header & Quick Actions */}
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: "rgba(99, 102, 241, 0.12)",
                color: "#818cf8",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Runtime Patch Engine
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Hotfix the Internet
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            Zero-code runtime patching for web applications. Intercept, repair, and test live customer
            flows on production without code deployments, then convert verified fixes into clean Pull
            Requests.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/editor"
            className="group flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shadow-lg hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              color: "#ffffff",
              boxShadow: "0 0 20px -3px rgba(99, 102, 241, 0.4)",
            }}
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeWidth="2" d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
            <span>Open Visual Editor</span>
          </Link>

          <Link
            href="/versions"
            className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.06]"
            style={{
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
              />
            </svg>
            <span>View Versions</span>
          </Link>

          <Link
            href="/log"
            className="flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.06]"
            style={{
              border: "1px solid var(--border-strong)",
              background: "var(--surface)",
              color: "var(--foreground)",
            }}
          >
            <svg className="h-4 w-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span>View Audit Log</span>
          </Link>
        </div>
      </section>

      {/* Connected Site & Snippet Card */}
      <section
        className="rounded-2xl p-5 sm:p-6 transition-all"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-bold tracking-tight text-white">{site.name}</span>
              <a
                href={site.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-mono transition-colors hover:text-white"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                <span>{site.url}</span>
                <span className="text-[10px]">↗</span>
              </a>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{
                  background: "var(--status-live-bg)",
                  color: "var(--status-live)",
                  border: "1px solid var(--status-live-border)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {liveVersionNumber !== null ? `Live: v${liveVersionNumber}` : "No live version"}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Include this script tag in your target site&apos;s <code className="text-zinc-300">&lt;head&gt;</code> to activate runtime hotfixing and instant previewing.
            </p>
          </div>

          <div className="w-full lg:max-w-xl">
            <SnippetCopy siteKey={site.site_key} />
          </div>
        </div>
      </section>

      {/* Overview Stat Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Patches */}
        <div
          className="group relative overflow-hidden rounded-xl p-5 transition-all hover:border-indigo-500/40"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Total Patches
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--accent)",
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {totalPatches}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {publishedPatches} published
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Active on client runtime</span>
          </div>
        </div>

        {/* Card 2: Draft Patches */}
        <div
          className="group relative overflow-hidden rounded-xl p-5 transition-all hover:border-amber-500/40"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Draft Patches
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "var(--status-draft-bg)",
                color: "var(--status-draft)",
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {draftPatches}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              in working set
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
            {draftPatches > 0 ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="text-amber-300/90 font-medium">Ready to publish</span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                <span>No pending drafts</span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Live Version */}
        <div
          className="group relative overflow-hidden rounded-xl p-5 transition-all hover:border-emerald-500/40"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Live Version
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "var(--status-live-bg)",
                color: "var(--status-live)",
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-400 font-mono">
              {liveVersionNumber !== null ? `v${liveVersionNumber}` : "v0"}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              current release
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Serving live visitors</span>
          </div>
        </div>

        {/* Card 4: Recent Activity */}
        <div
          className="group relative overflow-hidden rounded-xl p-5 transition-all hover:border-purple-500/40"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Recent Activity
            </span>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: "rgba(168, 85, 247, 0.12)",
                color: "#c084fc",
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            <span className="truncate text-base font-bold text-white capitalize">
              {recentActivity ? formatActivityText(recentActivity) : "No activity"}
            </span>
            <span className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
              {recentActivity ? formatDate(recentActivity.created_at) : "System ready"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
            <Link href="/log" className="text-indigo-400 hover:underline">
              Inspect audit stream &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Patches Table Section */}
      <section
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Recent Patches</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Live runtime overrides targeted on <strong className="text-zinc-200">{site.name}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/editor"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
              }}
            >
              <span>+ Create Patch</span>
            </Link>
          </div>
        </div>

        {patches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead
                className="border-b text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  borderColor: "var(--border)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--muted)",
                }}
              >
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Patch &amp; Modifications
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Target Selector
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Last Updated
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {patches.map((p) => {
                  const summary = summarizeChanges(p.changes);
                  const isBroken = Boolean(p.last_broken_at);

                  return (
                    <tr
                      key={p.id}
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      {/* Name & Change Summary */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {p.name}
                          </span>
                          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                            {summary}
                          </span>
                          {isBroken && (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
                              style={{
                                background: "var(--status-broken-bg)",
                                color: "var(--status-broken)",
                                border: "1px solid var(--status-broken-border)",
                              }}
                            >
                              <span>⚠ Couldn&apos;t find element on visitor page ({formatDate(p.last_broken_at)})</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Monospace Target Selector */}
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate">
                          <code
                            className="rounded px-2 py-1 font-mono text-xs"
                            style={{
                              background: "rgba(255, 255, 255, 0.04)",
                              border: "1px solid var(--border)",
                              color: "var(--foreground-subtle)",
                            }}
                            title={p.target?.selector ?? p.target?.tag ?? "Custom target"}
                          >
                            {p.target?.selector ?? p.target?.tag ?? "custom selector"}
                          </code>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>

                      {/* Updated Date */}
                      <td className="px-6 py-4 text-xs" style={{ color: "var(--muted)" }}>
                        {formatDate(p.updated_at ?? p.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {p.pr_url && (
                            <a
                              href={p.pr_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              <span>PR opened</span>
                              <span>↗</span>
                            </a>
                          )}

                          <Link
                            href="/editor"
                            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white/[0.08]"
                            style={{
                              border: "1px solid var(--border-strong)",
                              color: "var(--foreground)",
                            }}
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{
                background: "rgba(99, 102, 241, 0.12)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              🎯
            </div>
            <h3 className="text-base font-semibold text-white">No patches yet</h3>
            <p className="mt-1 max-w-sm text-sm" style={{ color: "var(--muted)" }}>
              Open the Visual Editor to inspect your live site, select UI elements, and create your
              first runtime hotfix.
            </p>
            <Link
              href="/editor"
              className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:brightness-110"
              style={{
                background: "var(--accent)",
                color: "var(--accent-text)",
              }}
            >
              Open Visual Editor
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function summarizeChanges(changes: unknown): string {
  if (!Array.isArray(changes) || changes.length === 0) return "No modifications recorded";
  return changes
    .map((c) => {
      if (!c || typeof c !== "object") return "edit";
      if (c.type === "text") return `text: "${c.value ?? ""}"`;
      if (c.type === "style" && c.props) {
        return `style: ${Object.keys(c.props).join(", ")}`;
      }
      if (c.type === "hide") return "hide";
      if (c.type === "attribute") return `attr: ${c.name ?? ""}`;
      return String(c.type || "edit");
    })
    .join(" · ");
}

function formatActivityText(log: AuditLogRow): string {
  const d = log.details || {};
  switch (log.action) {
    case "published":
      return `v${d.number ?? 1} Published`;
    case "rolled_back":
      return `Rolled back to v${d.to ?? "?"}`;
    case "created":
      return `Created "${log.patch_name ?? d.name ?? "Patch"}"`;
    case "edited":
      return `Edited "${log.patch_name ?? d.name ?? "Patch"}"`;
    case "pr_opened":
      return `PR Opened for ${log.patch_name ?? "patch"}`;
    case "reported_broken":
      return `Element missing reported`;
    default:
      return `${log.action.replace("_", " ")}`;
  }
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
