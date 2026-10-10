import { db } from "@/lib/supabase";

// POST { version_id } -> point the site's live version at any version (back or forward).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.version_id !== "string") return Response.json({ error: "version_id required" }, { status: 400 });

  const { data: version } = await db
    .from("versions")
    .select("id, site_id, number")
    .eq("id", body.version_id)
    .maybeSingle();
  if (!version) return Response.json({ error: "unknown version" }, { status: 404 });

  const { data: site } = await db.from("sites").select("live_version_id").eq("id", version.site_id).single();
  const { data: from } = site?.live_version_id
    ? await db.from("versions").select("number").eq("id", site.live_version_id).maybeSingle()
    : { data: null };

  const { error } = await db.from("sites").update({ live_version_id: version.id }).eq("id", version.site_id);
  if (error) return Response.json({ error: "update failed" }, { status: 500 });

  await db.from("audit_log").insert({
    site_id: version.site_id,
    action: "rolled_back",
    version_id: version.id,
    details: { from: from?.number ?? null, to: version.number },
  });
  return Response.json({ ok: true });
}
