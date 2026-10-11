import { db } from "@/lib/supabase";
import { currentUser, unauthorized } from "@/lib/auth";
import { readJson } from "@/lib/json";
import { workingSet } from "@/lib/workingSet";

// POST { site_id, note? } -> freeze the working set into a new version and make it live.
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = await readJson(request);
  if (typeof body?.site_id !== "string") return Response.json({ error: "site_id required" }, { status: 400 });
  const siteId: string = body.site_id;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const { data: patches, error } = await workingSet(siteId);
  if (error) return Response.json({ error: "lookup failed" }, { status: 500 });

  const { data: last } = await db
    .from("versions")
    .select("number")
    .eq("site_id", siteId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (last?.number ?? -1) + 1;

  // Frozen copy: the version keeps its own snapshot, never a reference to patch rows.
  const { data: version, error: vErr } = await db
    .from("versions")
    .insert({ site_id: siteId, number, patches, note })
    .select("id, number")
    .single();
  if (vErr) return Response.json({ error: "version insert failed" }, { status: 500 });

  const ids = patches.map((p) => p.id);
  if (ids.length) {
    const { error: uErr } = await db.from("patches").update({ status: "published" }).in("id", ids);
    if (uErr) return Response.json({ error: "patch update failed" }, { status: 500 });
  }
  const { error: sErr } = await db.from("sites").update({ live_version_id: version.id }).eq("id", siteId);
  if (sErr) return Response.json({ error: "site update failed" }, { status: 500 });

  await db.from("audit_log").insert({
    site_id: siteId,
    action: "published",
    version_id: version.id,
    details: { number, patches: patches.map((p) => p.name) },
    actor: user.name,
  });
  // Live patches with no PR yet: the dashboard offers to make them permanent.
  const { data: unfixed } = ids.length
    ? await db.from("patches").select("id, name").in("id", ids).is("pr_url", null).order("created_at")
    : { data: [] };
  return Response.json({ version, unfixed: unfixed ?? [] });
}
