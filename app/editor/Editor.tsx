"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Site = { id: string; name: string; url: string; preview_token: string };
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

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-2 text-sm">
          <span className="font-medium">{site.name}</span>
          <div className="ml-auto flex overflow-hidden rounded border border-zinc-300">
            {(["browse", "select"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 capitalize ${mode === m ? "bg-zinc-900 text-white" : "bg-white"}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <iframe ref={iframe} src={src} className="flex-1 border-0" title="Site preview" />
      </div>

      <aside className="w-80 overflow-y-auto border-l border-zinc-200 p-4 text-sm">
        {!target || !form ? (
          <p className="text-zinc-500">
            Use <b>Browse</b> to get to the element (e.g. open the bag), then switch to <b>Select</b> and click it.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded bg-zinc-100 p-2 font-mono text-xs break-all">{target.selector}</div>
            <Field label="Patch name">
              <input className="input" value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Text">
              <input className="input disabled:bg-zinc-100" value={form.text} onChange={set("text")} disabled={!textEditable} />
              {!textEditable && <span className="text-xs text-zinc-500">Has nested elements; text can only be changed on a single element.</span>}
            </Field>
            <ColorField label="Text colour" value={form.color} placeholder={current?.color} onChange={set("color")}
              onPick={(v) => setForm((f) => f && { ...f, color: v })} />
            <ColorField label="Background" value={form.backgroundColor} placeholder={current?.backgroundColor}
              onChange={set("backgroundColor")} onPick={(v) => setForm((f) => f && { ...f, backgroundColor: v })} />
            <Field label="Font size">
              <input className="input" value={form.fontSize} placeholder={current?.fontSize} onChange={set("fontSize")} />
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.hide} onChange={set("hide")} /> Hide element
            </label>
            <Field label="Attribute">
              <div className="flex gap-2">
                <input className="input" placeholder="name" value={form.attrName} onChange={set("attrName")} />
                <input className="input" placeholder="value" value={form.attrValue} onChange={set("attrValue")} />
              </div>
            </Field>
            <button
              onClick={save}
              disabled={saving || !changes.length || !form.name.trim()}
              className="rounded bg-zinc-900 px-3 py-2 font-medium text-white disabled:opacity-40"
            >
              {savedId ? "Update draft" : "Save as draft"}
            </button>
            {status && <p className="text-zinc-600">{status}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
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
        <input type="color" className="h-8 w-8 shrink-0" onChange={(e) => props.onPick(e.target.value)} />
      </div>
    </Field>
  );
}
