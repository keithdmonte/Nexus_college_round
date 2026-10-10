import { db } from "@/lib/supabase";
import { readJson, safeAttr } from "@/lib/json";
import { cluesOf, rankFiles } from "@/lib/github";
import { suggestFix } from "@/lib/llm";

// POST { site_id, target, current, prompt } -> Claude's suggested form values for the selected element.
// Nothing is saved: the editor fills its form, shows the result live, and the user saves as usual.
export async function POST(request: Request) {
  const body = await readJson(request);
  if (typeof body?.site_id !== "string" || !body.target || typeof body.target !== "object")
    return Response.json({ error: "site_id and target required" }, { status: 400 });
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 500) return Response.json({ error: "describe the problem (max 500 characters)" }, { status: 400 });

  const { data: site } = await db.from("sites").select("github_repo").eq("id", body.site_id).maybeSingle();
  if (!site) return Response.json({ error: "unknown site" }, { status: 404 });

  try {
    // The site's own code lets Claude use its CSS variables and the attribute names its scripts expect.
    const files = site.github_repo ? await rankFiles(site.github_repo, cluesOf({ target: body.target, changes: [] })) : [];
    const fix = await suggestFix({ target: body.target, current: body.current ?? null, prompt }, files);

    // Same safety rule as saved patches: no code-running attributes.
    if (fix.attrName && (!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/.test(fix.attrName) || !safeAttr(fix.attrName, fix.attrValue ?? "")))
      return Response.json({ error: "Claude suggested an unsafe attribute; fix it by hand" }, { status: 422 });
    return Response.json({ fix, searched: files.map((f) => f.path) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 502 });
  }
}
