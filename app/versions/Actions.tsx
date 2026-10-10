"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(url: string, body: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) {
      setError(data.error ?? "network error");
      return false;
    }
    router.refresh();
    return true;
  }
  return { busy, error, run };
}

export function PublishButton({ siteId, isDemo }: { siteId: string; isDemo?: boolean }) {
  const { busy, error, run } = useAction();
  const [note, setNote] = useState("");
  const [published, setPublished] = useState(false);

  async function handlePublish() {
    if (isDemo) return;
    const ok = await run("/api/publish", { site_id: siteId, note });
    if (ok) {
      setNote("");
      setPublished(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          className="input"
          style={{ maxWidth: "16rem" }}
          placeholder={isDemo ? "Note (disabled in demo)" : "Note (optional)"}
          value={note}
          disabled={isDemo}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          onClick={handlePublish}
          disabled={isDemo || busy}
          className="rounded-lg px-5 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: isDemo ? "rgba(99, 102, 241, 0.2)" : "var(--accent)",
            color: isDemo ? "var(--muted)" : "var(--accent-text)",
            border: isDemo ? "1px solid rgba(99, 102, 241, 0.3)" : "none",
          }}
          title={isDemo ? "Publishing requires a connected Supabase database" : undefined}
        >
          {isDemo ? "Publish (Disabled in Demo)" : busy ? "Publishing…" : "Publish"}
        </button>
      </div>

      {isDemo && (
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>
          Publishing is disabled in Demo Mode. Connect Supabase to create and freeze new versions.
        </span>
      )}

      {error && (
        <span className="text-sm font-medium" style={{ color: "var(--status-broken)" }}>
          Publish failed: {error}
        </span>
      )}

      {/* Post-publish PR prompt */}
      {published && (
        <div
          className="flex items-center gap-3 rounded-lg px-4 py-3"
          style={{
            background: "var(--status-published-bg)",
            border: "1px solid var(--status-published-border)",
          }}
        >
          <span className="text-sm font-medium" style={{ color: "var(--status-published)" }}>
            ✓ Patch is live.
          </span>
          <span className="text-sm" style={{ color: "var(--foreground)" }}>
            Want me to open a PR to fix this in the code?
          </span>
          <button
            onClick={() => {
              setPublished(false);
            }}
            className="rounded-md px-3 py-1.5 text-sm font-semibold transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--accent-text)",
            }}
          >
            Yes
          </button>
          <button
            onClick={() => setPublished(false)}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              border: "1px solid var(--border-strong)",
              color: "var(--muted)",
              background: "var(--surface)",
            }}
          >
            Not now
          </button>
        </div>
      )}
    </div>
  );
}

export function RollbackButton({
  versionId,
  number,
  isDemo,
}: {
  versionId: string;
  number: number;
  isDemo?: boolean;
}) {
  const { busy, error, run } = useAction();
  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs font-medium" style={{ color: "var(--status-broken)" }}>
          {error}
        </span>
      )}
      <button
        onClick={() => {
          if (isDemo) return;
          run("/api/rollback", { version_id: versionId });
        }}
        disabled={isDemo || busy}
        className="rounded-lg px-4 py-1.5 text-sm font-medium transition-all disabled:opacity-40"
        style={{
          border: "1px solid var(--border-strong)",
          color: isDemo ? "var(--muted)" : "var(--foreground)",
          background: "var(--surface)",
          cursor: isDemo ? "not-allowed" : "pointer",
        }}
        title={isDemo ? "Version switching is disabled in Demo Mode" : undefined}
      >
        {isDemo ? `Make v${number} live (Demo)` : busy ? "Switching…" : `Make v${number} live`}
      </button>
    </div>
  );
}
