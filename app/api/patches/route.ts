import { db } from "@/lib/supabase";
import { readJson, safeAttr } from "@/lib/json";

type Change =
  | { type: "text"; value: string }
  | { type: "style"; props: Record<string, string> }
  | { type: "hide" }
  | { type: "attribute"; name: string; value: string | null };

// Only the four known change types pass; anything else (e.g. "script") is rejected.
function validChange(c: unknown): c is Change {
  if (!c || typeof c !== "object") return false;
  const ch = c as Record<string, unknown>;
  switch (ch.type) {
    case "text":
      return typeof ch.value === "string";
    case "style":
      return (
        !!ch.props &&
        typeof ch.props === "object" &&
        Object.values(ch.props).every((v) => typeof v === "string")
      );
    case "hide":
      return true;
    case "attribute":
      return (
        typeof ch.name === "string" &&
        ch.name !== "" &&
        (typeof ch.value === "string" || ch.value === null) &&
        safeAttr(ch.name, ch.value)
      );
    default:
      return false;
  }
}

function parse(body: Record<string, unknown> | null) {
  if (!body) return "invalid JSON";
  if (typeof body.name !== "string" || !body.name.trim()) return "name required";
  if (!body.target || typeof body.target !== "object") return "target required";
  if (!Array.isArray(body.changes) || !body.changes.length) return "at least one change required";
  if (!body.changes.every(validChange)) return "invalid change";
  return { name: body.name.trim(), target: body.target, changes: body.changes };
}

// POST { site_id, name, page?, target, changes } -> new draft patch.
export async function POST(request: Request) {
  const body = await readJson(request);
  const fields = parse(body);
  if (typeof fields === "string") return Response.json({ error: fields }, { status: 400 });
  if (typeof body.site_id !== "string") return Response.json({ error: "site_id required" }, { status: 400 });

  const { data: patch, error } = await db
    .from("patches")
    .insert({ ...fields, site_id: body.site_id, page: typeof body.page === "string" ? body.page : "*", status: "draft" })
    .select()
    .single();
  if (error) return Response.json({ error: "insert failed" }, { status: 500 });

  await db.from("audit_log").insert({ site_id: patch.site_id, action: "created", patch_id: patch.id, details: { name: patch.name } });
  return Response.json({ patch });
}

// PATCH { id, name, target, changes } -> update an existing patch.
export async function PATCH(request: Request) {
  const body = await readJson(request);
  const fields = parse(body);
  if (typeof fields === "string") return Response.json({ error: fields }, { status: 400 });
  if (typeof body.id !== "string") return Response.json({ error: "id required" }, { status: 400 });

  const { data: patch, error } = await db
    .from("patches")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select()
    .maybeSingle();
  if (error) return Response.json({ error: "update failed" }, { status: 500 });
  if (!patch) return Response.json({ error: "unknown patch" }, { status: 404 });

  await db.from("audit_log").insert({ site_id: patch.site_id, action: "edited", patch_id: patch.id, details: { name: patch.name } });
  return Response.json({ patch });
}

// DELETE { id } -> retire a patch. It stays in old versions but leaves the working set,
// so the next publish drops it.
export async function DELETE(request: Request) {
  const body = await readJson(request);
  if (typeof body?.id !== "string") return Response.json({ error: "id required" }, { status: 400 });

  const { data: patch, error } = await db
    .from("patches")
    .update({ status: "retired", updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select("id, site_id, name")
    .maybeSingle();
  if (error) return Response.json({ error: "update failed" }, { status: 500 });
  if (!patch) return Response.json({ error: "unknown patch" }, { status: 404 });

  await db.from("audit_log").insert({ site_id: patch.site_id, action: "retired", patch_id: patch.id, details: { name: patch.name } });
  return Response.json({ ok: true });
}
