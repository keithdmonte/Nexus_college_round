"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Patches" },
  { href: "/editor", label: "Editor" },
  { href: "/versions", label: "Versions" },
  { href: "/log", label: "Audit log" },
];

export default function Nav({ live }: { live: React.ReactNode }) {
  const path = usePathname();
  return (
    <nav className="flex h-16 shrink-0 items-center gap-8 border-b border-zinc-800 px-8 text-sm">
      <Link href="/" className="text-lg font-extrabold tracking-tight">
        patch<span className="text-accent">work</span>
      </Link>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={path === l.href ? "border-b-2 border-accent pb-1 text-white" : "pb-1 text-zinc-500 hover:text-zinc-200"}
        >
          {l.label}
        </Link>
      ))}
      <div className="ml-auto">{live}</div>
    </nav>
  );
}
