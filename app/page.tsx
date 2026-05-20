export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { loadTokens } from "@/lib/auth";
import SyncButton from "@/components/SyncButton";
import SpendingLineChart from "@/components/SpendingLineChart";
import CategoryCharts from "@/components/CategoryCharts";
import Link from "next/link";
import { Wallet, Receipt, ShoppingCart, Award, Package, Tag, type LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Data fetch (unchanged from your original)
// ---------------------------------------------------------------------------
function getDashboardStats() {
  const db = getDb();

  const totalSpent = (
    db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as v FROM receipts`).get() as { v: number }
  ).v;

  const receiptCount = (db.prepare(`SELECT COUNT(*) as v FROM receipts`).get() as { v: number }).v;

  const avgPerTrip = receiptCount > 0 ? totalSpent / receiptCount : 0;

  const topCategory = db
    .prepare(
      `SELECT category, SUM(amount) as total FROM items GROUP BY category ORDER BY total DESC LIMIT 1`
    )
    .get() as { category: string; total: number } | undefined;

  const totalSavings = (
    db.prepare(`SELECT COALESCE(SUM(amount), 0) as v FROM items WHERE on_sale = 1`).get() as {
      v: number;
    }
  ).v;

  const uniqueItems = (
    db.prepare(`SELECT COUNT(DISTINCT name) as v FROM items`).get() as {
      v: number;
    }
  ).v;

  const topItems = db
    .prepare(
      `SELECT name, category, SUM(amount) as total_spent, COUNT(*) as count
       FROM items GROUP BY name, category ORDER BY total_spent DESC LIMIT 10`
    )
    .all() as {
    name: string;
    category: string;
    total_spent: number;
    count: number;
  }[];

  const dayOfWeek = db
    .prepare(
      `SELECT strftime('%w', timestamp) as dow, COUNT(*) as cnt, SUM(total_amount) as total
       FROM receipts GROUP BY dow ORDER BY dow ASC`
    )
    .all() as { dow: string; cnt: number; total: number }[];

  return {
    totalSpent,
    receiptCount,
    avgPerTrip,
    topCategory,
    totalSavings,
    uniqueItems,
    topItems,
    dayOfWeek,
  };
}

// ---------------------------------------------------------------------------
// Formatters — tabular, grouped, two decimals. Per the design system.
// ---------------------------------------------------------------------------
const currency = (n: number) => "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---------------------------------------------------------------------------
// Tiny shared primitives — kept inline; promote to /components when reused.
// ---------------------------------------------------------------------------
function Surface({
  className = "",
  children,
  padded = true,
}: {
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-subtle)] bg-white shadow-[var(--shadow-sm)] ${
        padded ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.12em] text-[var(--fg-muted)] uppercase">
      {children}
    </div>
  );
}

function KpiCard({
  label,
  value,
  Icon,
  sub,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  sub?: string;
}) {
  return (
    <Surface className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <span className="shrink-0 text-[var(--fg-muted)]">
          <Icon size={16} strokeWidth={1.75} />
        </span>
      </div>
      <div
        className="truncate text-[24px] leading-[1.1] font-bold tracking-[-0.015em] text-[var(--fg-default)] tabular-nums"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
      {sub && <div className="truncate text-xs text-[var(--fg-muted)]">{sub}</div>}
    </Surface>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_success?: string; auth_error?: string }>;
}) {
  void searchParams;
  const isAuthenticated = loadTokens() !== null;
  const stats = getDashboardStats();

  const kpiCards: Array<{
    label: string;
    value: string;
    Icon: LucideIcon;
    sub?: string;
  }> = [
    {
      label: "Total spent",
      value: currency(stats.totalSpent),
      Icon: Wallet,
      sub: `across ${stats.receiptCount} receipts`,
    },
    {
      label: "Receipts",
      value: stats.receiptCount.toString(),
      Icon: Receipt,
    },
    {
      label: "Avg per trip",
      value: currency(stats.avgPerTrip),
      Icon: ShoppingCart,
    },
    {
      label: "Top category",
      value: stats.topCategory?.category ?? "—",
      Icon: Award,
      sub: stats.topCategory ? currency(stats.topCategory.total) : undefined,
    },
    {
      label: "Unique products",
      value: stats.uniqueItems.toString(),
      Icon: Package,
    },
    {
      label: "On-sale savings",
      value: currency(stats.totalSavings),
      Icon: Tag,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1
            className="text-[32px] leading-tight font-bold tracking-[-0.02em] text-[var(--fg-default)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--fg-muted)]">
            Your Longo&apos;s grocery spending at a glance
          </p>
        </div>
        <SyncButton isAuthenticated={isAuthenticated} />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {kpiCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1">
        <SpendingLineChart />
      </div>
      <div className="grid grid-cols-1">
        <CategoryCharts />
      </div>

      {/* Day-of-week */}
      {stats.dayOfWeek.length > 0 && (
        <Surface>
          <h2
            className="mb-5 text-[22px] leading-snug font-semibold tracking-[-0.01em] text-[var(--fg-default)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Trips by day of week
          </h2>
          <div className="grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, dow) => {
              const d = stats.dayOfWeek.find((r) => parseInt(r.dow) === dow);
              const maxCnt = Math.max(...stats.dayOfWeek.map((r) => r.cnt), 1);
              const pct = d ? (d.cnt / maxCnt) * 100 : 0;
              return (
                <div key={dow} className="flex flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-[var(--paper-100)]">
                    <div
                      className="w-full rounded-b-lg bg-[var(--sage-500)] transition-all duration-300 ease-out"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[var(--fg-default)]">
                    {DAY_NAMES[dow]}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--fg-muted)] tabular-nums">
                    {d?.cnt ?? 0}
                  </span>
                </div>
              );
            })}
          </div>
        </Surface>
      )}

      {/* Top 10 items */}
      {stats.topItems.length > 0 && (
        <Surface padded={false}>
          <div className="flex items-baseline justify-between border-b border-[var(--border-subtle)] px-6 py-5">
            <h2
              className="text-[22px] leading-snug font-semibold tracking-[-0.01em] text-[var(--fg-default)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Top 10 most-spent items
            </h2>
            <span className="text-xs text-[var(--fg-muted)]">All time · by total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--fg-muted)]">
                  <th className="w-12 px-6 py-3 text-[11px] font-semibold tracking-[0.1em] uppercase">
                    #
                  </th>
                  <th className="py-3 pr-4 text-[11px] font-semibold tracking-[0.1em] uppercase">
                    Item
                  </th>
                  <th className="py-3 pr-4 text-[11px] font-semibold tracking-[0.1em] uppercase">
                    Category
                  </th>
                  <th className="py-3 pr-4 text-right text-[11px] font-semibold tracking-[0.1em] uppercase">
                    Times
                  </th>
                  <th className="py-3 pr-6 text-right text-[11px] font-semibold tracking-[0.1em] uppercase">
                    Total spent
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.topItems.map((item, i) => (
                  <tr
                    key={item.name}
                    className="border-t border-[var(--border-subtle)] transition-colors hover:bg-[var(--paper-100)]"
                  >
                    <td className="px-6 py-3.5 font-mono text-[var(--fg-subtle)] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/items/${encodeURIComponent(item.name)}`}
                        className="font-medium text-[var(--fg-default)] underline-offset-2 hover:text-[var(--sage-600)] hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--paper-100)] px-2.5 py-1 text-xs font-medium text-[var(--ink-700)]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono text-[var(--fg-muted)] tabular-nums">
                      {item.count}×
                    </td>
                    <td className="py-3.5 pr-6 text-right font-mono font-semibold text-[var(--fg-default)] tabular-nums">
                      {currency(item.total_spent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
    </div>
  );
}
