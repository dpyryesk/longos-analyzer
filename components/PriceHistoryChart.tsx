"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface Purchase {
  date: string;
  amount: number;
  on_sale: number;
  inv_number: string;
}

interface Props {
  purchases: Purchase[];
  avgPrice: number;
}

export default function PriceHistoryChart({ purchases, avgPrice }: Props) {
  if (purchases.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No purchase history.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={purchases}
        margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickFormatter={(v: string) => v.slice(5)} // MM-DD
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          domain={["auto", "auto"]}
        />
        <Tooltip
          formatter={(v: unknown, _name: unknown, props: { payload?: { on_sale?: number } }) => [
            `$${(v as number).toFixed(2)}${props.payload?.on_sale ? " 🏷 SALE" : ""}`,
            "Price",
          ]}
          labelFormatter={(l: unknown) => `Date: ${l as string}`}
        />
        <ReferenceLine
          y={avgPrice}
          stroke="#6b7280"
          strokeDasharray="4 4"
          label={{ value: `Avg $${avgPrice.toFixed(2)}`, fontSize: 11, fill: "#6b7280" }}
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {purchases.map((p, i) => (
            <Cell
              key={i}
              fill={p.on_sale ? "#f59e0b" : "#15803d"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
