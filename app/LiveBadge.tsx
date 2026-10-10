import { connection } from "next/server";
import { db } from "@/lib/supabase";

// Nav pill: site name + live version number. Single-site build: the first (only) site.
export default async function LiveBadge() {
  await connection();
  const { data: site } = await db.from("sites").select("name, live_version_id").limit(1).maybeSingle();
  if (!site) return null;
  const { data: live } = site.live_version_id
    ? await db.from("versions").select("number").eq("id", site.live_version_id).maybeSingle()
    : { data: null };
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-zinc-500">{site.name}</span>
      {live && (
        <span className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-semibold text-blue-300">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />v{live.number} LIVE
        </span>
      )}
    </div>
  );
}
