import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import Editor from "./Editor";

export default function EditorPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-zinc-500">Loading editor…</p>}>
      <EditorLoader />
    </Suspense>
  );
}

// Single-site build: edit the first (only) site.
async function EditorLoader() {
  await connection();
  const { data: site } = await db.from("sites").select("id, name, url, preview_token").limit(1).maybeSingle();
  if (!site) return <p className="p-6 text-sm text-red-600">No site found. Seed the sites table first.</p>;
  return <Editor site={site} />;
}
