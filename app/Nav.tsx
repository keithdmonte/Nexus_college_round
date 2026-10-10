"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Patches" },
  { href: "/editor", label: "Editor" },
  { href: "/versions", label: "Versions" },
  { href: "/log", label: "Audit log" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-6 border-b border-zinc-200 px-6 py-3 text-sm">
      <Link href="/" className="font-semibold tracking-wide">PATCHWORK</Link>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={path === l.href ? "font-medium text-zinc-900" : "text-zinc-500 hover:text-zinc-900"}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
