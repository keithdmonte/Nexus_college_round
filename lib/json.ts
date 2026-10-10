// Dashboard routes only accept application/json. Other sites can send text/plain
// cross-origin without a CORS preflight; requiring JSON forces one, and these
// routes send no CORS headers, so the browser blocks it.
export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) return null;
  return request.json().catch(() => null);
}

// Attribute patches must not run code: no on* handlers, no srcdoc, no script URLs.
// Same rule as safeAttr() in public/snippet.js.
export function safeAttr(name: string, value: string | null) {
  if (/^on/i.test(name) || /^srcdoc$/i.test(name)) return false;
  return value === null || !/^(javascript|vbscript|data):/i.test(value.replace(/[\s\x00-\x1f]/g, ""));
}
