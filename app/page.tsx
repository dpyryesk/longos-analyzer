export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { loadTokens } from "@/lib/auth";
import SyncButton from "@/components/SyncButton";
import SpendingLineChart from "@/components/SpendingLineChart";
import CategoryCharts from "@/components/CategoryCharts";
import Link from "next/link";
import {
  Wallet,
  Receipt,
  ShoppingCart,
  Award,
  Package,
  Tag,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data fetch (unchanged from your original)
// ---------------------------------------------------------------------------
function getDashboardStats() {
  const db = getDb();

  const totalSpent = (
    db
      .prepare(`SELECT COALESCE(SUM(total_amount), 0) as v FROM receipts`)
      .get() as { v: number }
  ).v;

  const receiptCount = (
    db.prepare(`SELECT COUNT(*) as v FROM receipts`).get() as { v: number }
  ).v;

  const avgPerTrip = receiptCount > 0 ? totalSpent / receiptCount : 0;

  const topCategory = db
    .prepare(
      `SELECT category, SUM(amount) as total FROM items GROUP BY category ORDER BY total DESC LIMIT 1`,
    )
    .get() as { category: string; total: number } | undefined;

  const totalSavings = (
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as v FROM items WHERE on_sale = 1`,
      )
      .get() as { v: number }
  ).v;

  const uniqueItems = (
    db.prepare(`SELECT COUNT(DISTINCT name) as v FROM items`).get() as {
      v: number;
    }
  ).v;

  const topItems = db
    .prepare(
      `SELECT name, category, SUM(amount) as total_spent, COUNT(*) as count
       FROM items GROUP BY name, category ORDER BY total_spent DESC LIMIT 10`,
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
       FROM receipts GROUP BY dow ORDER BY dow ASC`,
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
const currency = (n: number) =>
  "$" +
  n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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
      className={`bg-white border border-[var(--border-subtle)] rounded-2xl shadow-[var(--shadow-sm)] ${
        padded ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-muted)]">
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
    <Surface className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <span className="text-[var(--fg-muted)]">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </div>
      <div
        className="text-[34px] leading-[1.06] tracking-[-0.02em] font-bold tabular-nums text-[var(--fg-default)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs text-[var(--fg-muted)]">{sub}</div>
      )}
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
            className="text-[32px] leading-tight tracking-[-0.02em] font-bold text-[var(--fg-default)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-[var(--fg-muted)] mt-1">
            Your Longo&apos;s grocery spending at a glance
          </p>
        </div>
        <SyncButton isAuthenticated={isAuthenticated} />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingLineChart />
        <CategoryCharts />
      </div>

      {/* Day-of-week */}
      {stats.dayOfWeek.length > 0 && (
        <Surface>
          <h2
            className="text-[22px] leading-snug tracking-[-0.01em] font-semibold text-[var(--fg-default)] mb-5"
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
                  <div className="w-full bg-[var(--paper-100)] rounded-lg overflow-hidden h-24 flex items-end">
                    <div
                      className="w-full bg-[var(--sage-500)] rounded-b-lg transition-all duration-300 ease-out"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[var(--fg-default)]">
                    {DAY_NAMES[dow]}
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-[var(--fg-muted)]">
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
          <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-baseline justify-between">
            <h2
              className="text-[22px] leading-snug tracking-[-0.01em] font-semibold text-[var(--fg-default)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Top 10 most-spent items
            </h2>
            <span className="text-xs text-[var(--fg-muted)]">
              All time · by total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--fg-muted)]">
                  <th className="px-6 py-3 font-semibold text-[11px] uppercase tracking-[0.1em] w-12">
                    #
                  </th>
                  <th className="py-3 pr-4 font-semibold text-[11px] uppercase tracking-[0.1em]">
                    Item
                  </th>
                  <th className="py-3 pr-4 font-semibold text-[11px] uppercase tracking-[0.1em]">
                    Category
                  </th>
                  <th className="py-3 pr-4 font-semibold text-[11px] uppercase tracking-[0.1em] text-right">
                    Times
                  </th>
                  <th className="py-3 pr-6 font-semibold text-[11px] uppercase tracking-[0.1em] text-right">
                    Total spent
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.topItems.map((item, i) => (
                  <tr
                    key={item.name}
                    className="border-t border-[var(--border-subtle)] hover:bg-[var(--paper-100)] transition-colors"
                  >
                    <td className="px-6 py-3.5 font-mono tabular-nums text-[var(--fg-subtle)]">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/items/${encodeURIComponent(item.name)}`}
                        className="font-medium text-[var(--fg-default)] hover:text-[var(--sage-600)] hover:underline underline-offset-2"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-[var(--paper-100)] text-[var(--ink-700)]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono tabular-nums text-[var(--fg-muted)]">
                      {item.count}×
                    </td>
                    <td className="py-3.5 pr-6 text-right font-mono tabular-nums font-semibold text-[var(--fg-default)]">
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
