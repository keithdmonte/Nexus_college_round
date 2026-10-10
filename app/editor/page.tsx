import { Suspense } from "react";
import { connection } from "next/server";
import { db } from "@/lib/supabase";
import Editor from "./Editor";

export default function EditorPage({
  searchParams,
}: {
  searchParams?: Promise<{ store?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-12 text-sm text-zinc-400">
          Loading editor…
        </div>
      }
    >
      <EditorLoader searchParams={searchParams} />
    </Suspense>
  );
}

// Single-site build: edit the first site if present, or provide clearly labeled local demo mode
async function EditorLoader({
  searchParams,
}: {
  searchParams?: Promise<{ store?: string }>;
}) {
  await connection();
  const resolvedParams = searchParams ? await searchParams : {};
  const storeParam = resolvedParams?.store;

  let site: {
    id: string;
    name: string;
    url: string;
    preview_token: string;
    is_demo?: boolean;
  } | null = null;

  try {
    const { data } = await db
      .from("sites")
      .select("id, name, url, preview_token")
      .limit(1)
      .maybeSingle();

    if (data) {
      site = { ...data, is_demo: false };
    }
  } catch {
    site = null;
  }

  // If backend database is not configured or table has no site yet,
  // load the safe, controlled demo site configuration.
  if (!site) {
    const isPort5500 = storeParam === "5500";
    site = {
      id: "demo-site",
      name: "Northfold Store",
      url: isPort5500 ? "http://localhost:5500" : "http://localhost:3000/demo-store",
      preview_token: "a5194d13273c3dde8f086ed5d6bd2b88",
      is_demo: true,
    };
  }

  return <Editor site={site} />;
}
