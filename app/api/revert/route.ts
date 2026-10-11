import { db } from "@/lib/supabase";
import { currentUser, unauthorized } from "@/lib/auth";
import { readJson } from "@/lib/json";
import { revertPullRequest } from "@/lib/github";

// POST { patch_id } -> open a GitHub PR that reverts the patch's merged PR (undo the code fix).
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = await readJson(request);
  if (typeof body?.patch_id !== "string") return Response.json({ error: "patch_id required" }, { status: 400 });

  const { data: patch } = await db
    .from("patches")
    .select("id, site_id, name, pr_url, revert_pr_url")
    .eq("id", body.patch_id)
    .maybeSingle();
  if (!patch) return Response.json({ error: "unknown patch" }, { status: 404 });
  if (!patch.pr_url) return Response.json({ error: "this patch has no PR" }, { status: 400 });
  if (patch.revert_pr_url) return Response.json({ revert_pr_url: patch.revert_pr_url });

  let url: string;
  try {
    url = await revertPullRequest(patch.pr_url, `Reverts the code fix for the PATCHWORK patch "${patch.name}".`);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "revert failed" }, { status: 502 });
  }

  // updated_at is left alone: on a retired patch it is the retire time shown in History.
  await db.from("patches").update({ revert_pr_url: url }).eq("id", patch.id);
  await db.from("audit_log").insert({
    site_id: patch.site_id,
    action: "revert_opened",
    patch_id: patch.id,
    details: { name: patch.name, pr_url: url },
    actor: user.name,
  });
  return Response.json({ revert_pr_url: url });
}
