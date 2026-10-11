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
  const [prompt, setPrompt] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [note, setNote] = useState("");

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
        setPrompt("");
        setNote("");
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

  // Natural-language fix: Claude reads the element and the site's code, then fills the form.
  async function suggest() {
    if (!target || !prompt.trim() || suggesting) return;
    setSuggesting(true);
    setNote("");
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: site.id, target, current, prompt }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSuggesting(false);
    if (!res?.ok) return setNote(`Couldn't suggest a fix: ${data.error ?? "network error"}`);
    const fix = data.fix;
    setForm((f) =>
      f && {
        ...f,
        name: fix.name || f.name,
        text: textEditable && fix.text !== null ? fix.text : f.text,
        color: fix.color ?? f.color,
        backgroundColor: fix.backgroundColor ?? f.backgroundColor,
        fontSize: fix.fontSize ?? f.fontSize,
        hide: fix.hide || f.hide,
        attrName: fix.attrName ?? f.attrName,
        attrValue: fix.attrName ? (fix.attrValue ?? "") : f.attrValue,
      }
    );
    setNote(fix.summary);
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => f && { ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3 text-sm">
          <span className="font-medium">{site.name}</span>
          <span className="text-zinc-500">
            {mode === "browse" ? "Use the store normally to reach the element" : "Click any element to edit it"}
          </span>
          <div className="ml-auto flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {(["browse", "select"] as const).map((m, i) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-4 py-1 capitalize ${mode === m ? "bg-accent font-semibold text-white" : "text-zinc-500"}`}
              >
                {i + 1} · {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col bg-zinc-900/60 p-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl shadow-2xl ring-1 ring-zinc-700">
            <div className="flex h-8 items-center gap-2 bg-zinc-800 px-3 font-mono text-xs text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
              <span className="ml-2">{site.url}</span>
            </div>
            <iframe ref={iframe} src={src} className="flex-1 border-0" title="Site preview" />
          </div>
        </div>
      </div>

      <aside className="flex w-96 flex-col border-l border-zinc-800 text-sm">
        {!target || !form ? (
          <div className="p-6 text-zinc-400">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">How to fix something</p>
            <ol className="mt-3 list-decimal space-y-2 pl-4">
              <li><b className="text-zinc-200">Browse</b> to the broken element (e.g. add an item and open the bag).</li>
              <li>Switch to <b className="text-zinc-200">Select</b> and click it.</li>
              <li>Fix it here. Changes show live in the page.</li>
            </ol>
          </div>
        ) : (
          <>
            <div className="border-b border-zinc-800 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Step 3 · Fix it</p>
              <input className="mt-2 w-full bg-transparent text-xl font-bold outline-none" value={form.name} onChange={set("name")} aria-label="Patch name" />
              <p className="mt-1 break-all font-mono text-xs text-blue-300">{target.selector}</p>
            </div>
            <div className="border-b border-zinc-800 p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Describe the problem</p>
              <textarea
                className="input mt-2 h-20 resize-none"
                placeholder="What looks wrong? e.g. the label is cut off on small screens"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button onClick={suggest} disabled={suggesting || !prompt.trim()} className="btn mt-3 w-full">
                {suggesting ? "Reading the site's code…" : "Suggest fix"}
              </button>
              {note && <p className="mt-3 text-blue-300">{note}</p>}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-[100px_1fr] items-center gap-x-3 gap-y-3">
                <Field label="Text">
                  <input className="input" value={form.text} onChange={set("text")} disabled={!textEditable} />
                </Field>
                {!textEditable && (
                  <span className="col-start-2 -mt-1 text-xs text-zinc-500">Has nested elements; text can only be changed on a single element.</span>
                )}
                <ColorField label="Text colour" value={form.color} placeholder={current?.color} onChange={set("color")}
                  onPick={(v) => setForm((f) => f && { ...f, color: v })} />
                <ColorField label="Background" value={form.backgroundColor} placeholder={current?.backgroundColor}
                  onChange={set("backgroundColor")} onPick={(v) => setForm((f) => f && { ...f, backgroundColor: v })} />
                <Field label="Font size">
                  <input className="input" value={form.fontSize} placeholder={current?.fontSize} onChange={set("fontSize")} />
                </Field>
                <Field label="Attribute">
                  <div className="flex gap-2">
                    <input className="input font-mono" placeholder="name" value={form.attrName} onChange={set("attrName")} />
                    <input className="input" placeholder="value" value={form.attrValue} onChange={set("attrValue")} />
                  </div>
                </Field>
                <Field label="Hide">
                  <input type="checkbox" className="h-4 w-4 justify-self-start accent-accent" checked={form.hide} onChange={set("hide")} />
                </Field>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-zinc-800 p-6">
              <span className="flex-1 text-xs text-zinc-500">
                {status || `${changes.length} change${changes.length === 1 ? "" : "s"} · live in the page`}
              </span>
              <button onClick={save} disabled={saving || !changes.length || !form.name.trim()} className="btn">
                {savedId ? "Update draft" : "Save draft"}
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-zinc-500">{label}</span>
      {children}
    </>
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
        <input type="color" className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-zinc-800 bg-zinc-900 p-1" onChange={(e) => props.onPick(e.target.value)} />
      </div>
    </Field>
  );
}
