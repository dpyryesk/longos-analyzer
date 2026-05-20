export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  // Overall spend per category
  const rows = db
    .prepare(
      `SELECT category,
              SUM(amount) as total,
              COUNT(*) as count,
              ROUND(AVG(amount), 2) as avg_price
       FROM items
       GROUP BY category
       ORDER BY total DESC`
    )
    .all() as {
    category: string;
    total: number;
    count: number;
    avg_price: number;
  }[];

  // Category spend per month (for stacked area chart)
  const trends = db
    .prepare(
      `SELECT strftime('%Y-%m', date) as period,
              category,
              SUM(amount) as total
       FROM items
       GROUP BY period, category
       ORDER BY period ASC`
    )
    .all() as { period: string; category: string; total: number }[];

  return Response.json({ categories: rows, trends });
}
