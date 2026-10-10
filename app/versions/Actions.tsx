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

export function PublishButton({ siteId }: { siteId: string }) {
  const { busy, error, run } = useAction();
  const [note, setNote] = useState("");
  return (
    <>
      <input className="input w-56" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button
        onClick={() => run("/api/publish", { site_id: siteId, note }).then((ok) => ok && setNote(""))}
        disabled={busy}
        className="rounded bg-zinc-900 px-3 py-1.5 font-medium text-white disabled:opacity-40"
      >
        {busy ? "Publishing…" : "Publish"}
      </button>
      {error && <span className="text-red-600">Publish failed: {error}</span>}
    </>
  );
}

export function RollbackButton({ versionId, number }: { versionId: string; number: number }) {
  const { busy, error, run } = useAction();
  return (
    <>
      {error && <span className="text-red-600">{error}</span>}
      <button
        onClick={() => run("/api/rollback", { version_id: versionId })}
        disabled={busy}
        className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
      >
        {busy ? "Switching…" : `Make v${number} live`}
      </button>
    </>
  );
}
