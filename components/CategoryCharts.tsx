"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface CategoryRow {
  category: string;
  total: number;
  count: number;
  avg_price: number;
}
interface TrendRow {
  period: string;
  category: string;
  total: number;
}

const COLORS = [
  "#15803d", "#16a34a", "#4ade80", "#86efac",
  "#bbf7d0", "#6b7280", "#f59e0b", "#ef4444",
  "#3b82f6", "#8b5cf6",
];

export default function CategoryCharts() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [trends, setTrends] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"pie" | "trends">("pie");

  useEffect(() => {
    fetch("/api/stats/categories")
      .then((r) => r.json())
      .then((d: { categories: CategoryRow[]; trends: TrendRow[] }) => {
        setCategories(d.categories);
        setTrends(d.trends);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Build stacked area data for trends
  const categoryNames = [...new Set(trends.map((t) => t.category))];
  const periods = [...new Set(trends.map((t) => t.period))].sort();
  const areaData = periods.map((period) => {
    const row: Record<string, string | number> = { period };
    for (const cat of categoryNames) {
      const found = trends.find((t) => t.period === period && t.category === cat);
      row[cat] = found ? Math.round(found.total * 100) / 100 : 0;
    }
    return row;
  });

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Category Breakdown</h2>
        <div className="flex gap-2">
          {(["pie", "trends"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                view === v
                  ? "bg-green-700 text-white border-green-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {v === "pie" ? "Pie Chart" : "Trends"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : categories.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          No data yet.
        </div>
      ) : view === "pie" ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={categories}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={110}
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {categories.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: unknown) => `$${(v as number).toFixed(2)}`} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={areaData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: unknown) => `$${v as number}`} />
            <Tooltip formatter={(v: unknown) => `$${(v as number).toFixed(2)}`} />
            <Legend />
            {categoryNames.map((cat, i) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="1"
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.7}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
