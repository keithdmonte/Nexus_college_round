"use client";

import { useState } from "react";

export function SnippetCopy({ siteKey }: { siteKey: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/snippet.js" data-key="${siteKey}"></script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code
        className="flex-1 rounded-lg px-3 py-2 font-mono text-xs break-all"
        style={{
          background: "var(--background)",
          border: "1px solid var(--border)",
          color: "var(--muted)",
        }}
      >
        {snippet}
      </code>
      <button
        onClick={copy}
        className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        style={{
          background: copied ? "var(--status-published-bg)" : "var(--surface)",
          color: copied ? "var(--status-published)" : "var(--foreground)",
          border: `1px solid ${copied ? "var(--status-published-border)" : "var(--border-strong)"}`,
        }}
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}
