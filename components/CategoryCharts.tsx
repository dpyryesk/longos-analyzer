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

// Design-token chart palette (ordered) — hex values required for Recharts SVG attrs
const CHART_COLORS = [
  "#4F6B40", // --chart-1  sage-500
  "#A8623A", // --chart-2  clay-500
  "#D4A23A", // --chart-3  amber-500
  "#5E8593", // --chart-4  sky-500
  "#84526B", // --chart-5  plum-500
  "#8FA67F", // --chart-6  sage-300
  "#D29A6A", // --chart-7  clay-300
];

const C = {
  ink100: "#E4E2D7",
  ink400: "#7A7F76",
  ink500: "#5A615A",
  paper50: "#FBF8F1",
  sage500: "#4F6B40",
};

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

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div
      style={{
        background: C.paper50,
        border: `1px solid ${C.ink100}`,
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 2px 8px rgba(27,31,26,0.08)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: C.ink400,
          marginBottom: 4,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {p.name}
      </p>
      <p
        style={{ fontSize: 13, color: p.fill, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
      >
        ${(p.value as number).toFixed(2)}
      </p>
    </div>
  );
}

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

  const emptyState = (
    <div
      style={{
        height: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: C.ink400,
        fontFamily: "var(--font-sans)",
        fontSize: "var(--fs-body-sm)",
      }}
    >
      {loading ? "Loading…" : "No data yet."}
    </div>
  );

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-sm)",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--fs-h2)",
            fontWeight: 600,
            lineHeight: "var(--lh-h2)",
            letterSpacing: "var(--tracking-h2)",
            color: "var(--fg-default)",
            margin: 0,
          }}
        >
          Category Breakdown
        </h2>
        <div style={{ display: "flex", gap: 6 }}>
          {(["pie", "trends"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontSize: "var(--fs-caption)",
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                padding: "4px 12px",
                borderRadius: "var(--r-pill)",
                border: `1px solid ${view === v ? C.sage500 : C.ink100}`,
                background: view === v ? C.sage500 : "transparent",
                color: view === v ? "#FBF8F1" : C.ink500,
                cursor: "pointer",
                transition: "all 120ms ease-out",
              }}
            >
              {v === "pie" ? "Pie Chart" : "Trends"}
            </button>
          ))}
        </div>
      </div>

      {loading || categories.length === 0 ? (
        emptyState
      ) : view === "pie" ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={categories}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={44}
              paddingAngle={2}
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {categories.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={areaData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.ink100} vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: C.ink400, fontFamily: "var(--font-sans)" }}
              axisLine={{ stroke: C.ink100 }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: C.ink400, fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: unknown) => `$${v as number}`}
              width={48}
            />
            {/*<Tooltip content={<CustomTooltip/>}/>*/}
            <Legend />
            <Tooltip formatter={(v: unknown) => `$${(v as number).toFixed(2)}`} />
            {categoryNames.map((cat, i) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="1"
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                fillOpacity={0.65}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
