import { db } from "@/lib/supabase";
import { readJson } from "@/lib/json";
import { cluesOf, openPullRequest, rankFiles, readFiles } from "@/lib/github";
import { applyEdits, proposeEdits, type Edit } from "@/lib/llm";

function validEdits(x: unknown): x is Edit[] {
  return Array.isArray(x) && x.every((e) => e && typeof e.file === "string" && typeof e.find === "string" && typeof e.replace === "string");
}

// POST { patch_id, action: "propose" } -> Claude's edits, validated, with before/after per edit.
// POST { patch_id, action: "open", edits, summary } -> re-validate against the repo, open the PR.
export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.patch_id !== "string") return Response.json({ error: "patch_id required" }, { status: 400 });

  const { data: patch } = await db
    .from("patches")
    .select("id, site_id, name, target, changes, sites(github_repo)")
    .eq("id", body.patch_id)
    .maybeSingle<{ id: string; site_id: string; name: string; target: Record<string, unknown>; changes: Array<Record<string, unknown>>; sites: { github_repo: string | null } }>();
  if (!patch) return Response.json({ error: "unknown patch" }, { status: 404 });
  const repo = patch.sites?.github_repo;
  if (!repo) return Response.json({ error: "site has no github_repo" }, { status: 400 });

  try {
    if (body.action === "propose") {
      const files = await rankFiles(repo, cluesOf(patch));
      if (!files.length) return Response.json({ error: "no source file matches this patch's clues" }, { status: 422 });
      const { summary, edits } = await proposeEdits(patch, files);
      const result = applyEdits(files, edits);
      if ("error" in result) return Response.json({ error: `Claude's edits were rejected: ${result.error}` }, { status: 422 });
      return Response.json({ summary, edits, searched: files.map((f) => f.path) });
    }

    if (body.action === "open") {
      if (!validEdits(body.edits) || typeof body.summary !== "string") return Response.json({ error: "edits and summary required" }, { status: 400 });
      const edits: Edit[] = body.edits;
      const files = await readFiles(repo, [...new Set(edits.map((e) => e.file))]);
      const result = applyEdits(files, edits);
      if ("error" in result) return Response.json({ error: `edits no longer apply: ${result.error}` }, { status: 409 });

      const prUrl = await openPullRequest(repo, {
        branch: `patchwork/${patch.id.slice(0, 8)}-${Date.now().toString(36)}`,
        title: body.summary,
        body: `Makes the PATCHWORK patch "${patch.name}" permanent.\n\nOnce merged and deployed, retire the patch in PATCHWORK.`,
        files: result.files.map((f) => ({ path: f.path, content: f.after })),
      });

      await db.from("patches").update({ pr_url: prUrl, updated_at: new Date().toISOString() }).eq("id", patch.id);
      await db.from("audit_log").insert({
        site_id: patch.site_id,
        action: "pr_opened",
        patch_id: patch.id,
        details: { name: patch.name, pr_url: prUrl, files: result.files.map((f) => f.path) },
      });
      return Response.json({ pr_url: prUrl });
    }
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
  return Response.json({ error: "action must be propose or open" }, { status: 400 });
}
