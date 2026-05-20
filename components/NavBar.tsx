"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/items", label: "Items" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav
      style={{
        background: "var(--bg-inverse)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-8 px-6 md:px-10">
        {/* Logo lockup — inverse variant for dark header */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="Longo's Analyzer home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-lockup-inverse.svg"
            alt="Longo's Analyzer"
            height={28}
            style={{ height: 28, width: "auto" }}
          />
        </Link>

        {/* Nav links */}
        <div className="flex gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--fs-body-sm)",
                  fontWeight: 500,
                  color: active ? "var(--fg-on-inverse)" : "var(--ink-300)",
                  background: active ? "rgba(255,255,255,0.10)" : "transparent",
                  borderRadius: "var(--r-sm)",
                  padding: "6px 12px",
                  transition: `background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)`,
                  textDecoration: "none",
                  display: "inline-block",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--fg-on-inverse)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-300)";
                  }
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
