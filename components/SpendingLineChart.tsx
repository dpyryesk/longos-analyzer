"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// Design-token hex values for use inside Recharts (CSS vars can't go in SVG attrs)
const C = {
  sage500: "#4F6B40", // --chart-1 / --brand
  clay500: "#A8623A", // --chart-2 / --accent
  amber500: "#D4A23A", // --chart-3
  ink100: "#E4E2D7", // --border-subtle / grid lines
  ink400: "#7A7F76", // --fg-subtle / axis ticks
  ink500: "#5A615A", // --fg-muted / tooltip
  paper50: "#FBF8F1", // --bg-page / tooltip bg
  paper100: "#F5F0E6", // --bg-surface-2
};

interface DataPoint {
  period: string;
  total: number;
  trips: number;
}

interface ChartPoint extends DataPoint {
  trend: number;
}

/** Ordinary least-squares linear regression; returns fitted y-values for each index. */
function linearRegression(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return values.map((v) => v);
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, y, i) => acc + i * y, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return values.map((_, i) => slope * i + intercept);
}

// Custom tooltip matching the design system surface style
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
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
          marginBottom: 6,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      {payload.map((p) => (
        <p
          key={p.name}
          style={{
            fontSize: 13,
            color: p.color,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            margin: "2px 0",
          }}
        >
          {p.name === "trend" ? "Trend" : "Total"}: ${p.value.toFixed(2)}
        </p>
      ))}
    </div>
  );
}

export default function SpendingLineChart() {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const [data, setData] = useState<DataPoint[]>([]);
  const [fetchedView, setFetchedView] = useState<"monthly" | "yearly" | null>(null);
  const loading = fetchedView !== view;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stats/monthly?view=${view}`)
      .then((r) => r.json())
      .then((d: DataPoint[]) => {
        if (!cancelled) {
          setData(d);
          setFetchedView(view);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedView(view);
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const trendValues = linearRegression(data.map((d) => d.total));
    return data.map((d, i) => ({
      ...d,
      trend: parseFloat(trendValues[i].toFixed(2)),
    }));
  }, [data]);

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
          Spending Over Time
        </h2>
        <div style={{ display: "flex", gap: 6 }}>
          {(["monthly", "yearly"] as const).map((v) => (
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
              {v === "monthly" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
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
          Loading…
        </div>
      ) : data.length === 0 ? (
        <div
          style={{
            height: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.ink400,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-body-sm)",
            textAlign: "center",
          }}
        >
          No data yet — sync your receipts to get started.
        </div>
      ) : (
        <>
          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: C.ink500,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 20,
                  height: 2,
                  background: C.sage500,
                  borderRadius: 1,
                }}
              />
              Total Spent
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: C.ink500,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 20,
                  height: 2,
                  background: C.amber500,
                  borderRadius: 1,
                  borderTop: `2px dashed ${C.amber500}`,
                }}
              />
              Trend
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.ink100} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: C.ink400, fontFamily: "var(--font-sans)" }}
                axisLine={{ stroke: C.ink100 }}
                tickLine={false}
                tickFormatter={(v: unknown) =>
                  view === "monthly" ? (v as string).slice(2) : (v as string)
                }
              />
              <YAxis
                tick={{ fontSize: 11, fill: C.ink400, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: unknown) => `$${(v as number).toFixed(0)}`}
                width={52}
              />
              <ReferenceLine y={0} stroke={C.ink100} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                stroke={C.sage500}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: C.sage500, stroke: "#fff", strokeWidth: 2 }}
                name="total"
              />
              <Line
                type="monotone"
                dataKey="trend"
                stroke={C.amber500}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                name="trend"
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
