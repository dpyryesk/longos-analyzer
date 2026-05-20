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
  Legend,
} from "recharts";

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
  const sumX = (n * (n - 1)) / 2; // 0+1+…+(n-1)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, y, i) => acc + i * y, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return values.map((_, i) => slope * i + intercept);
}

export default function SpendingLineChart() {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const [data, setData] = useState<DataPoint[]>([]);
  const [fetchedView, setFetchedView] = useState<"monthly" | "yearly" | null>(null);

  // loading is derived: true whenever the fetched view doesn't match the selected view
  const loading = fetchedView !== view;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stats/monthly?view=${view}`)
      .then((r) => r.json())
      .then((d: DataPoint[]) => {
        if (!cancelled) { setData(d); setFetchedView(view); }
      })
      .catch(() => { if (!cancelled) setFetchedView(view); });
    return () => { cancelled = true; };
  }, [view]);

  const chartData = useMemo<ChartPoint[]>(() => {
    const trendValues = linearRegression(data.map((d) => d.total));
    return data.map((d, i) => ({
      ...d,
      trend: parseFloat(trendValues[i].toFixed(2)),
    }));
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Spending Over Time</h2>
        <div className="flex gap-2">
          {(["monthly", "yearly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                view === v
                  ? "bg-green-700 text-white border-green-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {v === "monthly" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
          No data yet — sync your receipts to get started.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: unknown) =>
                view === "monthly"
                  ? (v as string).slice(2) // "2024-11" → "24-11"
                  : (v as string)
              }
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: unknown) => `$${(v as number).toFixed(0)}`}
            />
            <Tooltip
              formatter={(value: unknown, name: unknown) => [
                `$${(value as number).toFixed(2)}`,
                name === "trend" ? "Trend" : "Total Spent ($)",
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#15803d"
              strokeWidth={2}
              dot={false}
              name="Total Spent ($)"
            />
            <Line
              type="monotone"
              dataKey="trend"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Trend"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
