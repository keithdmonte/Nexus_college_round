import "server-only";
import { db } from "@/lib/supabase";

// The working set: every non-retired patch (draft + published). Preview shows it,
// Publish freezes it into a version (decision 23), so both read it from here.
export function workingSet(siteId: string) {
  return db
    .from("patches")
    .select("id, name, page, target, changes")
    .eq("site_id", siteId)
    .neq("status", "retired")
    .order("created_at");
}
