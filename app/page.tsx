export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { loadTokens } from "@/lib/auth";
import SyncButton from "@/components/SyncButton";
import SpendingLineChart from "@/components/SpendingLineChart";
import CategoryCharts from "@/components/CategoryCharts";
import Link from "next/link";

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

  const avgPerTrip =
    receiptCount > 0 ? totalSpent / receiptCount : 0;

  const topCategory = db
    .prepare(
      `SELECT category, SUM(amount) as total FROM items GROUP BY category ORDER BY total DESC LIMIT 1`
    )
    .get() as { category: string; total: number } | undefined;

  const totalSavings = (
    db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as v FROM items WHERE on_sale = 1`)
      .get() as { v: number }
  ).v;

  const uniqueItems = (
    db.prepare(`SELECT COUNT(DISTINCT name) as v FROM items`).get() as { v: number }
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

  // Spend by day of week
  const dayOfWeek = db
    .prepare(
      `SELECT strftime('%w', timestamp) as dow, COUNT(*) as cnt, SUM(total_amount) as total
       FROM receipts GROUP BY dow ORDER BY dow ASC`
    )
    .all() as { dow: string; cnt: number; total: number }[];

  return { totalSpent, receiptCount, avgPerTrip, topCategory, totalSavings, uniqueItems, topItems, dayOfWeek };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_success?: string; auth_error?: string }>;
}) {
  void searchParams; // unused but required for type
  const isAuthenticated = loadTokens() !== null;
  const stats = getDashboardStats();

  const kpiCards = [
    { label: "Total Spent", value: `$${stats.totalSpent.toFixed(2)}`, icon: "💰" },
    { label: "Receipts", value: stats.receiptCount.toString(), icon: "🧾" },
    { label: "Avg Per Trip", value: `$${stats.avgPerTrip.toFixed(2)}`, icon: "🛒" },
    { label: "Top Category", value: stats.topCategory?.category ?? "—", icon: "🥇" },
    { label: "Unique Products", value: stats.uniqueItems.toString(), icon: "📦" },
    { label: "Total Savings", value: `$${stats.totalSavings.toFixed(2)}`, icon: "🏷️" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your Longo&apos;s grocery spending at a glance
          </p>
        </div>
        <SyncButton isAuthenticated={isAuthenticated} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-white rounded-xl shadow p-4 flex flex-col gap-1"
          >
            <span className="text-2xl">{icon}</span>
            <span className="text-xs text-gray-500 font-medium">{label}</span>
            <span className="text-lg font-bold text-gray-900">{value}</span>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingLineChart />
        <CategoryCharts />
      </div>

      {/* Day-of-week spending */}
      {stats.dayOfWeek.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Trips by Day of Week</h2>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, dow) => {
              const d = stats.dayOfWeek.find((r) => parseInt(r.dow) === dow);
              const maxCnt = Math.max(...stats.dayOfWeek.map((r) => r.cnt), 1);
              const pct = d ? (d.cnt / maxCnt) * 100 : 0;
              return (
                <div key={dow} className="flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 rounded-lg overflow-hidden h-20 flex items-end">
                    <div
                      className="w-full bg-green-500 rounded-b-lg transition-all"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{DAY_NAMES[dow]}</span>
                  <span className="text-xs text-gray-400">{d?.cnt ?? 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 10 items */}
      {stats.topItems.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Top 10 Most Spent Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">Item</th>
                  <th className="pb-2 pr-4 font-medium">Category</th>
                  <th className="pb-2 pr-4 font-medium text-right">Times</th>
                  <th className="pb-2 font-medium text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {stats.topItems.map((item, i) => (
                  <tr key={item.name} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/items/${encodeURIComponent(item.name)}`}
                        className="text-green-700 hover:underline font-medium"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{item.category}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{item.count}×</td>
                    <td className="py-2 text-right font-semibold text-gray-900">
                      ${item.total_spent.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
