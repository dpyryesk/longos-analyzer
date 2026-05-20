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

// Design-token hex values (CSS vars cannot be used in SVG attrs)
const C = {
  sage500: "#4F6B40", // regular price bar — --chart-1
  amber500: "#D4A23A", // on-sale bar — --chart-3
  ink100: "#E4E2D7", // grid / reference line
  ink400: "#7A7F76", // axis ticks / avg label
  ink500: "#5A615A", // tooltip muted text
  paper50: "#FBF8F1", // tooltip background
};

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

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: Purchase }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const onSale = p.payload?.on_sale;
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
        {label}
      </p>
      <p
        style={{
          fontSize: 13,
          color: onSale ? C.amber500 : C.sage500,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ${(p.value as number).toFixed(2)}
        {onSale ? " · on sale" : ""}
      </p>
    </div>
  );
}

export default function PriceHistoryChart({ purchases, avgPrice }: Props) {
  if (purchases.length === 0) {
    return (
      <div
        style={{
          height: 192,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.ink400,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--fs-body-sm)",
        }}
      >
        No purchase history.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={purchases}
        margin={{ top: 10, right: 8, bottom: 5, left: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke={C.ink100} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: C.ink400, fontFamily: "var(--font-sans)" }}
          axisLine={{ stroke: C.ink100 }}
          tickLine={false}
          tickFormatter={(v: string) => v.slice(5)} // MM-DD
        />
        <YAxis
          tick={{ fontSize: 11, fill: C.ink400, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          domain={["auto", "auto"]}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(27,31,26,0.04)" }} />
        <ReferenceLine
          y={avgPrice}
          stroke={C.ink400}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{
            value: `Avg $${avgPrice.toFixed(2)}`,
            fontSize: 11,
            fill: C.ink400,
            fontFamily: "var(--font-mono)",
          }}
        />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {purchases.map((p, i) => (
            <Cell key={i} fill={p.on_sale ? C.amber500 : C.sage500} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
