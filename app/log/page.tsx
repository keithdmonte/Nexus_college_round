import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/lib/supabase";

type AuditRow = {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown>;
  patch_name?: string | null;
  patches?: { name: string } | { name: string }[] | null;
};

export default function LogPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
          <Link href="/" className="hover:text-white transition-colors">
            PATCHWORK
          </Link>
          <span>/</span>
          <span className="text-zinc-200">Audit Trail</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Audit Log
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Tamper-evident record of all runtime overrides, release publications, and rollbacks across your application.
        </p>
      </div>

      <Suspense fallback={<LogLoadingSkeleton />}>
        <LogLoader />
      </Suspense>
    </main>
  );
}

function LogLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-14 rounded-xl bg-white/[0.03]" />
      <div className="h-64 rounded-xl bg-white/[0.03]" />
    </div>
  );
}

async function LogLoader() {
  await connection();

  let rows: AuditRow[] = [];
  let isDemo = false;

  try {
    const { data: site } = await db.from("sites").select("id").limit(1).maybeSingle();

    if (site) {
      const { data } = await db
        .from("audit_log")
        .select("id, action, created_at, details, patches(name)")
        .eq("site_id", site.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (data) {
        rows = (data as unknown as AuditRow[]).map((r) => {
          const patchName = Array.isArray(r.patches)
            ? r.patches[0]?.name
            : r.patches?.name;
          return {
            ...r,
            patch_name: patchName ?? null,
          };
        });
      }
    } else {
      isDemo = true;
    }
  } catch {
    isDemo = true;
  }

  // Fallback to clearly labeled sample audit activities when Supabase is not connected
  if (isDemo || !rows.length) {
    if (isDemo) {
      rows = [
        {
          id: "demo-log-1",
          action: "published",
          created_at: "2026-10-10T21:42:00.000Z",
          details: { number: 1, patches: ["Fix Checkout button"] },
          patch_name: "Fix Checkout button",
        },
        {
          id: "demo-log-2",
          action: "edited",
          created_at: "2026-10-10T21:38:00.000Z",
          details: { changes: ["style: color", "attribute: data-checkout"] },
          patch_name: "Fix Checkout button",
        },
        {
          id: "demo-log-3",
          action: "created",
          created_at: "2026-10-10T21:30:00.000Z",
          details: { selector: "aside.drawer div.totals > button" },
          patch_name: "Fix Checkout button",
        },
        {
          id: "demo-log-4",
          action: "rolled_back",
          created_at: "2026-10-10T20:45:00.000Z",
          details: { from: 1, to: 0 },
        },
        {
          id: "demo-log-5",
          action: "created",
          created_at: "2026-10-10T20:10:00.000Z",
          details: { status: "draft" },
          patch_name: "Hide promo banner",
        },
        {
          id: "demo-log-6",
          action: "published",
          created_at: "2026-10-10T19:30:00.000Z",
          details: { number: 0, patches: [] },
        },
      ];
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Demo Mode Notice */}
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
              sample audit activities for the Northfold Store. Real audit logs will record and stream
              automatically once Supabase is connected.
            </span>
          </div>
          <span
            className="rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--accent)",
            }}
          >
            Sample Log
          </span>
        </div>
      )}

      {/* Audit Log Table Card */}
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
            <h2 className="text-base font-bold text-white">Event Stream</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              Chronological log of mutations, newest events first
            </p>
          </div>
          <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            {rows.length} event{rows.length === 1 ? "" : "s"}
          </span>
        </div>

        {rows.length > 0 ? (
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
                  <th scope="col" className="px-6 py-3.5 w-48">
                    Timestamp
                  </th>
                  <th scope="col" className="px-6 py-3.5 w-40">
                    Action
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Description &amp; Event Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {rows.map((r) => {
                  const badge = getActionBadge(r.action);
                  const desc = describe(r);

                  return (
                    <tr
                      key={r.id}
                      className="group transition-colors hover:bg-white/[0.02]"
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4 text-xs font-mono" style={{ color: "var(--muted)" }}>
                        {formatDate(r.created_at)}
                      </td>

                      {/* Action Badge */}
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-white group-hover:text-indigo-300 transition-colors">
                            {desc.main}
                          </span>
                          {desc.sub && (
                            <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                              {desc.sub}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-sm" style={{ color: "var(--muted)" }}>
            Nothing logged yet. Creating and publishing patches will record activities here.
          </div>
        )}
      </section>
    </div>
  );
}

function getActionBadge(action: string) {
  switch (action) {
    case "published":
      return {
        label: "Published",
        icon: "🚀",
        color: "var(--action-published)",
        bg: "rgba(52, 211, 153, 0.12)",
        border: "rgba(52, 211, 153, 0.3)",
      };
    case "rolled_back":
      return {
        label: "Rolled Back",
        icon: "↩",
        color: "var(--action-rolled-back)",
        bg: "rgba(251, 146, 60, 0.12)",
        border: "rgba(251, 146, 60, 0.3)",
      };
    case "created":
      return {
        label: "Created",
        icon: "＋",
        color: "var(--action-created)",
        bg: "rgba(96, 165, 250, 0.12)",
        border: "rgba(96, 165, 250, 0.3)",
      };
    case "edited":
      return {
        label: "Edited",
        icon: "✎",
        color: "var(--action-edited)",
        bg: "rgba(251, 191, 36, 0.12)",
        border: "rgba(251, 191, 36, 0.3)",
      };
    case "pr_opened":
      return {
        label: "PR Opened",
        icon: "⎇",
        color: "var(--action-pr-opened)",
        bg: "rgba(192, 132, 252, 0.12)",
        border: "rgba(192, 132, 252, 0.3)",
      };
    case "reported_broken":
      return {
        label: "Broken Warning",
        icon: "⚠",
        color: "var(--action-broken)",
        bg: "rgba(248, 113, 113, 0.14)",
        border: "rgba(248, 113, 113, 0.3)",
      };
    case "retired":
      return {
        label: "Retired",
        icon: "📦",
        color: "var(--action-retired)",
        bg: "rgba(148, 163, 184, 0.1)",
        border: "rgba(148, 163, 184, 0.2)",
      };
    default:
      return {
        label: action.replace("_", " "),
        icon: "•",
        color: "var(--foreground)",
        bg: "rgba(255, 255, 255, 0.08)",
        border: "rgba(255, 255, 255, 0.15)",
      };
  }
}

function describe(r: AuditRow): { main: string; sub?: string } {
  const d = r.details || {};
  switch (r.action) {
    case "published": {
      const patchList = Array.isArray(d.patches) ? d.patches.join(", ") : "no patches";
      return {
        main: `Release v${d.number ?? 1} made live`,
        sub: `Included patches: ${patchList}`,
      };
    }
    case "rolled_back":
      return {
        main: `Release active version changed: v${d.from ?? "?"} → v${d.to}`,
        sub: "Store traffic shifted instantly",
      };
    case "created":
      return {
        main: `New patch draft created: "${r.patch_name ?? (d.name as string) ?? "Patch"}"`,
        sub: (d.selector as string) ? `Selector: ${d.selector}` : undefined,
      };
    case "edited":
      return {
        main: `Draft patch modified: "${r.patch_name ?? (d.name as string) ?? "Patch"}"`,
        sub: Array.isArray(d.changes) ? `Changes: ${d.changes.join(", ")}` : undefined,
      };
    case "pr_opened":
      return {
        main: `GitHub Pull Request initiated for ${r.patch_name ?? "patch"}`,
        sub: (d.pr_url as string) ? (d.pr_url as string) : undefined,
      };
    case "reported_broken":
      return {
        main: `Element near-miss or missing reported on visitor page`,
        sub: r.patch_name ? `Patch: ${r.patch_name}` : undefined,
      };
    default:
      return {
        main: `${r.patch_name ?? (d.name as string) ?? r.action.replace("_", " ")}`,
      };
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
