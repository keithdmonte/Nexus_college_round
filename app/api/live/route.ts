import { db } from "@/lib/supabase";
import { workingSet } from "@/lib/workingSet";

// Called by snippet.js from the customer's site, so CORS is open.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// GET /api/live?key=<site_key>[&preview=<preview_token>]
// -> the live version's frozen patches, or the working set (every non-retired patch) with a valid preview token.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = params.get("key");
  const preview = params.get("preview");
  if (!key) return json({ error: "missing key" }, 400);

  const { data: site, error } = await db
    .from("sites")
    .select("id, live_version_id, preview_token")
    .eq("site_key", key)
    .maybeSingle();
  if (error) return json({ error: "lookup failed" }, 500);
  if (!site) return json({ error: "unknown key" }, 404);

  let patches: Array<Record<string, unknown>>;
  if (preview) {
    if (preview !== site.preview_token) return json({ error: "bad preview token" }, 403);
    const { data, error: pErr } = await workingSet(site.id);
    if (pErr) return json({ error: "lookup failed" }, 500);
    patches = data;
  } else {
    if (!site.live_version_id) return json({ patches: [] });
    const { data: version, error: vErr } = await db
      .from("versions")
      .select("patches")
      .eq("id", site.live_version_id)
      .single();
    if (vErr) return json({ error: "lookup failed" }, 500);
    patches = version.patches;
  }

  return json({ patches: patches.map(({ id, page, target, changes }) => ({ id, page, target, changes })) });
}

// POST /api/live { key, patch_id } -> flag a patch as broken for this visitor.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const key = body?.key;
  const patchId = body?.patch_id;
  if (typeof key !== "string" || typeof patchId !== "string") {
    return json({ error: "missing key or patch_id" }, 400);
  }

  const { data: site } = await db.from("sites").select("id").eq("site_key", key).maybeSingle();
  if (!site) return json({ error: "unknown key" }, 404);

  const { data: patch } = await db
    .from("patches")
    .update({ last_broken_at: new Date().toISOString() })
    .eq("id", patchId)
    .eq("site_id", site.id)
    .select("id")
    .maybeSingle();
  if (!patch) return json({ error: "unknown patch" }, 404);

  await db.from("audit_log").insert({ site_id: site.id, action: "reported_broken", patch_id: patch.id });
  return json({ ok: true });
}
