export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const name = decodeURIComponent(slug).toUpperCase();
  const db = getDb();

  // Aggregate stats
  const stats = db
    .prepare(
      `SELECT name,
              category,
              SUM(amount)           AS total_spent,
              COUNT(*)              AS count,
              ROUND(AVG(amount), 2)  AS avg_price,
              MIN(amount)           AS min_price,
              MAX(amount)           AS max_price,
              MIN(date)             AS first_seen,
              MAX(date)             AS last_seen,
              SUM(on_sale)          AS sale_count
       FROM items
       WHERE name = ?
       GROUP BY name, category`
    )
    .get(name) as
    | {
        name: string;
        category: string;
        total_spent: number;
        count: number;
        avg_price: number;
        min_price: number;
        max_price: number;
        first_seen: string;
        last_seen: string;
        sale_count: number;
      }
    | undefined;

  if (!stats) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  // Each purchase (for price history chart)
  const purchases = db
    .prepare(
      `SELECT i.date, i.amount, i.on_sale, r.inv_number
       FROM items i
       JOIN receipts r ON r.id = i.receipt_id
       WHERE i.name = ?
       ORDER BY i.date ASC`
    )
    .all(name) as {
    date: string;
    amount: number;
    on_sale: number;
    inv_number: string;
  }[];

  return Response.json({ stats, purchases });
}
