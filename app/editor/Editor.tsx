"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Site = { id: string; name: string; url: string; preview_token: string; is_demo?: boolean };
type Target = {
  tag: string;
  text: string | null;
  classes: string[];
  attrs: Record<string, string>;
  parent: { tag: string; classes: string[] } | null;
  selector: string;
};
type Current = { color: string; backgroundColor: string; fontSize: string };
type Change =
  | { type: "text"; value: string }
  | { type: "style"; props: Record<string, string> }
  | { type: "hide" }
  | { type: "attribute"; name: string; value: string };
type Form = {
  name: string;
  text: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  hide: boolean;
  attrName: string;
  attrValue: string;
};

function emptyForm(t: Target): Form {
  return {
    name: `Fix ${t.text ? `"${t.text}"` : t.tag}`,
    text: t.text ?? "",
    color: "",
    backgroundColor: "",
    fontSize: "",
    hide: false,
    attrName: "",
    attrValue: "",
  };
}

function buildChanges(f: Form, t: Target): Change[] {
  const changes: Change[] = [];
  if (f.text !== (t.text ?? "")) changes.push({ type: "text", value: f.text });
  const props: Record<string, string> = {};
  if (f.color.trim()) props.color = f.color.trim();
  if (f.backgroundColor.trim()) props.backgroundColor = f.backgroundColor.trim();
  if (f.fontSize.trim()) props.fontSize = f.fontSize.trim();
  if (Object.keys(props).length) changes.push({ type: "style", props });
  if (f.hide) changes.push({ type: "hide" });
  if (f.attrName.trim()) changes.push({ type: "attribute", name: f.attrName.trim(), value: f.attrValue });
  return changes;
}

export default function Editor({ site }: { site: Site }) {
  const siteOrigin = new URL(site.url).origin;
  const src = useMemo(() => {
    const u = new URL(site.url);
    u.searchParams.set("pw_edit", site.preview_token);
    return u.toString();
  }, [site.url, site.preview_token]);

  const iframe = useRef<HTMLIFrameElement>(null);
  const [mode, setMode] = useState<"browse" | "select">("browse");
  const modeRef = useRef(mode);
  const [target, setTarget] = useState<Target | null>(null);
  const [current, setCurrent] = useState<Current | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [textEditable, setTextEditable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const changes = useMemo(() => (form && target ? buildChanges(form, target) : []), [form, target]);

  function post(msg: unknown) {
    iframe.current?.contentWindow?.postMessage(msg, siteOrigin);
  }

  // Messages from editor.js: accept only the site's origin and our own iframe.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== siteOrigin || e.source !== iframe.current?.contentWindow) return;
      const msg = e.data || {};
      if (msg.type === "pw:ready") {
        setTarget(null);
        setForm(null);
        iframe.current?.contentWindow?.postMessage({ type: "pw:mode", mode: modeRef.current }, siteOrigin);
      } else if (msg.type === "pw:select") {
        setTarget(msg.target);
        setCurrent(msg.current);
        setTextEditable(msg.textEditable !== false);
        setForm(emptyForm(msg.target));
        setSavedId(null);
        setStatus("");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [siteOrigin]);

  useEffect(() => {
    modeRef.current = mode;
    post({ type: "pw:mode", mode });
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every form edit shows live in the iframe.
  useEffect(() => {
    if (target) post({ type: "pw:apply", changes });
  }, [changes]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (site.is_demo) {
      setStatus("Save unavailable in Demo Mode: Supabase database is not connected. Real-time preview is active, but persisting drafts requires backend setup.");
      return;
    }
    if (!form || !target || saving) return;
    setSaving(true);
    setStatus("Saving…");
    const res = await fetch("/api/patches", {
      method: savedId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        savedId
          ? { id: savedId, name: form.name, target, changes }
          : { site_id: site.id, name: form.name, page: "*", target, changes }
      ),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (!res?.ok) return setStatus(`Save failed: ${data.error ?? res?.status ?? "network error"}`);
    setSavedId(data.patch.id);
    setStatus(savedId ? "Draft updated" : "Saved as draft");
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => f && { ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const saved = status === "Saved as draft" || status === "Draft updated";
  const failed = status.startsWith("Save failed");

  return (
    <div className="flex flex-1" style={{ background: "var(--surface)" }}>
      {/* Left: iframe column */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div
          className="flex items-center gap-4 px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              Editor
            </span>
            <span
              className="rounded-md px-2 py-0.5 text-xs font-medium"
              style={{
                background: "var(--accent-subtle)",
                color: "var(--accent)",
              }}
            >
              {site.name}
            </span>
            {site.is_demo && (
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "var(--status-draft)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                }}
              >
                ⚡ Demo Mode
              </span>
            )}
          </div>

          {/* If in demo mode, provide quick store switcher */}
          {site.is_demo && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs" style={{ borderColor: "var(--border)", background: "rgba(255, 255, 255, 0.02)" }}>
              <span className="text-[11px]" style={{ color: "var(--muted)" }}>Store:</span>
              <a
                href="/editor"
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                  site.url.includes("demo-store")
                    ? "bg-indigo-500/20 text-indigo-300 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Local /demo-store
              </a>
              <span className="text-zinc-600">|</span>
              <a
                href="/editor?store=5500"
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium transition ${
                  site.url.includes(":5500")
                    ? "bg-indigo-500/20 text-indigo-300 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Port :5500
              </a>
            </div>
          )}

          {/* Segmented control */}
          <div
            className="ml-auto flex overflow-hidden rounded-lg"
            style={{
              border: "1px solid var(--border-strong)",
              background: "var(--background)",
            }}
          >
            {(["browse", "select"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-5 py-2 text-sm font-semibold capitalize transition-all"
                style={{
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "var(--accent-text)" : "var(--muted)",
                  minWidth: "5.5rem",
                }}
              >
                {m === "browse" ? "👁 Browse" : "🎯 Select"}
              </button>
            ))}
          </div>
        </div>

        {/* Iframe */}
        <iframe ref={iframe} src={src} className="flex-1 border-0" title="Site preview" />
      </div>

      {/* Right: side panel */}
      <aside
        className="flex w-[340px] shrink-0 flex-col overflow-y-auto p-5"
        style={{
          borderLeft: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        {!target || !form ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ background: "var(--accent-subtle)" }}
            >
              🎯
            </div>
            <p className="mb-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              Select an element
            </p>
            <p className="max-w-[260px] text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              Use <strong style={{ color: "var(--foreground)" }}>Browse</strong> to navigate the site
              (e.g. open the bag), then switch to{" "}
              <strong style={{ color: "var(--foreground)" }}>Select</strong> and click an element.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Selector */}
            <div
              className="rounded-lg p-3 font-mono text-xs leading-relaxed break-all"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              {target.selector}
            </div>

            {/* Patch name */}
            <Field label="Patch name">
              <input className="input" value={form.name} onChange={set("name")} />
            </Field>

            {/* Divider */}
            <hr style={{ borderColor: "var(--border)" }} />

            {/* Text */}
            <Field label="Text">
              <input className="input" value={form.text} onChange={set("text")} disabled={!textEditable} />
              {!textEditable && (
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  Has nested elements — text editing is disabled.
                </span>
              )}
            </Field>

            {/* Colour fields */}
            <ColorField
              label="Text colour"
              value={form.color}
              placeholder={current?.color}
              onChange={set("color")}
              onPick={(v) => setForm((f) => f && { ...f, color: v })}
            />
            <ColorField
              label="Background"
              value={form.backgroundColor}
              placeholder={current?.backgroundColor}
              onChange={set("backgroundColor")}
              onPick={(v) => setForm((f) => f && { ...f, backgroundColor: v })}
            />

            {/* Font size */}
            <Field label="Font size">
              <input
                className="input"
                value={form.fontSize}
                placeholder={current?.fontSize}
                onChange={set("fontSize")}
              />
            </Field>

            {/* Hide */}
            <label
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: form.hide ? "var(--status-broken-bg)" : "var(--background)",
                border: `1px solid ${form.hide ? "var(--status-broken-border)" : "var(--border)"}`,
                color: form.hide ? "var(--status-broken)" : "var(--foreground)",
              }}
            >
              <input
                type="checkbox"
                checked={form.hide}
                onChange={set("hide")}
                className="h-4 w-4 rounded accent-red-600"
              />
              Hide element
            </label>

            {/* Divider */}
            <hr style={{ borderColor: "var(--border)" }} />

            {/* Attribute */}
            <Field label="Attribute">
              <div className="flex gap-2">
                <input className="input" placeholder="name" value={form.attrName} onChange={set("attrName")} />
                <input className="input" placeholder="value" value={form.attrValue} onChange={set("attrValue")} />
              </div>
            </Field>

            {/* Save button */}
            <button
              onClick={save}
              disabled={!site.is_demo && (saving || !changes.length || !form.name.trim())}
              className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: site.is_demo ? "rgba(239, 68, 68, 0.12)" : "var(--accent)",
                color: site.is_demo ? "var(--status-broken)" : "var(--accent-text)",
                border: site.is_demo ? "1px solid rgba(239, 68, 68, 0.28)" : "none",
              }}
            >
              {site.is_demo
                ? "Save unavailable (Demo Mode)"
                : saving
                  ? "Saving…"
                  : savedId
                    ? "Update draft"
                    : "Save as draft"}
            </button>
            {site.is_demo && (
              <span className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
                Live overrides in the iframe are fully active. Connecting the Supabase backend will
                enable saving drafts and publishing versions.
              </span>
            )}

            {/* Status line */}
            {status && (
              <p
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{
                  color: failed
                    ? "var(--status-broken)"
                    : saved
                      ? "var(--status-published)"
                      : "var(--muted)",
                }}
              >
                {saved && "✓ "}
                {failed && "✕ "}
                {status}
              </p>
            )}

            {/* Post-save convenience buttons */}
            {saved && (
              <div
                className="flex gap-2 rounded-lg p-3"
                style={{
                  background: "var(--status-published-bg)",
                  border: "1px solid var(--status-published-border)",
                }}
              >
                <Link
                  href={`${site.url}?pw_preview=${site.preview_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors"
                  style={{
                    border: "1px solid var(--status-published-border)",
                    color: "var(--status-published)",
                    background: "var(--surface)",
                  }}
                >
                  Preview
                </Link>
                <Link
                  href="/versions"
                  className="flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold transition-colors"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-text)",
                  }}
                >
                  Go to Publish
                </Link>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

// Free text (so CSS variables like var(--on-accent) work) plus a picker shortcut.
function ColorField(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPick: (v: string) => void;
}) {
  return (
    <Field label={props.label}>
      <div className="flex gap-2">
        <input className="input" value={props.value} placeholder={props.placeholder} onChange={props.onChange} />
        <input
          type="color"
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border-0"
          style={{ border: "1px solid var(--border-strong)" }}
          onChange={(e) => props.onPick(e.target.value)}
        />
      </div>
    </Field>
  );
}
