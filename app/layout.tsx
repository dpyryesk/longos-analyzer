import type { Metadata } from "next";
import "./globals.css";
import "../styles/colors_and_type.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Longo's Receipt Analyzer",
  description: "Analyze your Longo's grocery spending trends",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/*
        Body uses design-system tokens:
          --bg-page    warm cream, never white
          --fg-default deep slate ink
          --font-sans  Geist (set as the default body face)
        Tailwind arbitrary values pull straight from the CSS vars so the
        existing Tailwind workflow keeps working.
      */}
      <body
        className="min-h-screen bg-[var(--bg-page)] text-[var(--fg-default)] antialiased"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <NavBar />
        <main className="mx-auto max-w-[1240px] px-6 py-8 md:px-10">{children}</main>
      </body>
    </html>
  );
}
