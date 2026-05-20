export const dynamic = "force-dynamic";

import { getDb } from "@/lib/db";
import { loadTokens } from "@/lib/auth";

export async function GET() {
  const isAuthenticated = loadTokens() !== null;
  const db = getDb();

  const totalSpent = (
    db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as v FROM receipts`).get() as { v: number }
  ).v;

  const receiptCount = (db.prepare(`SELECT COUNT(*) as v FROM receipts`).get() as { v: number }).v;

  const avgPerTrip = receiptCount > 0 ? Math.round((totalSpent / receiptCount) * 100) / 100 : 0;

  const topCategory = db
    .prepare(
      `SELECT category, SUM(amount) as total
       FROM items
       GROUP BY category
       ORDER BY total DESC
       LIMIT 1`
    )
    .get() as { category: string; total: number } | undefined;

  const totalSavings = (
    db.prepare(`SELECT COALESCE(SUM(amount), 0) as v FROM items WHERE on_sale = 1`).get() as {
      v: number;
    }
  ).v;

  const uniqueItems = (
    db.prepare(`SELECT COUNT(DISTINCT name) as v FROM items`).get() as { v: number }
  ).v;

  const dayOfWeek = db
    .prepare(
      `SELECT strftime('%w', date) as dow, COUNT(*) as cnt
       FROM receipts
       GROUP BY dow
       ORDER BY cnt DESC
       LIMIT 1`
    )
    .get() as { dow: string; cnt: number } | undefined;

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const favDay = dayOfWeek ? days[parseInt(dayOfWeek.dow)] : null;

  return Response.json({
    isAuthenticated,
    totalSpent,
    receiptCount,
    avgPerTrip,
    topCategory: topCategory?.category ?? null,
    totalSavings,
    uniqueItems,
    favDay,
  });
}
