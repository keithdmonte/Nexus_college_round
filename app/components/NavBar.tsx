"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Patches", href: "/" },
  { label: "Editor", href: "/editor" },
  { label: "Versions", href: "/versions" },
  { label: "Log", href: "/log" },
] as const;

export default function NavBar() {
  const pathname = usePathname();
  if (pathname?.startsWith("/demo-store")) return null;

  return (
    <nav
      className="sticky top-0 z-40 flex items-center justify-between border-b px-6 py-3 backdrop-blur-md"
      style={{
        borderColor: "var(--border)",
        background: "rgba(17, 19, 31, 0.85)",
      }}
    >
      <div className="flex items-center gap-1">
        {/* Logo / Wordmark */}
        <Link
          href="/"
          className="mr-6 flex items-center gap-2.5 font-semibold tracking-tight transition-opacity hover:opacity-90"
          style={{ color: "var(--foreground)", fontSize: "1.05rem" }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold shadow-sm"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              color: "#ffffff",
              boxShadow: "0 0 12px rgba(99, 102, 241, 0.35)",
            }}
          >
            PW
          </span>
          <span className="font-bold tracking-tight">PATCHWORK</span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--accent)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
          >
            Runtime
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ label, href }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-1.5 text-sm font-medium transition-all"
                style={{
                  color: active ? "var(--foreground)" : "var(--muted)",
                  background: active ? "rgba(99, 102, 241, 0.14)" : "transparent",
                  border: active
                    ? "1px solid rgba(99, 102, 241, 0.28)"
                    : "1px solid transparent",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right status badge */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            color: "var(--status-live)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>Runtime Active</span>
        </div>
      </div>
    </nav>
  );
}
