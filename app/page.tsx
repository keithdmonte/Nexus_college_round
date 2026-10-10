import Link from "next/link";

// Minimal home until the Phase 5 dashboard cleanup.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6 text-zinc-900">
      <h1 className="mb-4 text-xl font-semibold">PATCHWORK</h1>
      <ul className="flex flex-col gap-2 underline">
        <li><Link href="/editor">Editor</Link></li>
        <li><Link href="/versions">Versions</Link></li>
        <li><Link href="/log">Audit log</Link></li>
      </ul>
    </main>
  );
}
