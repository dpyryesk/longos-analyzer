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
    <nav className="bg-green-700 text-white shadow">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-8">
        <span className="font-bold text-lg tracking-tight">🛒 Longo&apos;s Analyzer</span>
        <div className="flex gap-4">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
                pathname === href || (href !== "/" && pathname.startsWith(href))
                  ? "bg-white/20"
                  : "hover:bg-white/10"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
