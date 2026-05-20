export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

const VALID_SORT = new Set(["total_spent", "count", "avg_price", "name"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get("category") ?? "";
  const search = params.get("search") ?? "";
  const sort = VALID_SORT.has(params.get("sort") ?? "")
    ? (params.get("sort") as string)
    : "total_spent";
  const order = params.get("order") === "asc" ? "ASC" : "DESC";

  const db = getDb();

  let sql = `
    SELECT name,
           category,
           SUM(amount)          AS total_spent,
           COUNT(*)             AS count,
           ROUND(AVG(amount), 2) AS avg_price,
           MIN(amount)          AS min_price,
           MAX(amount)          AS max_price,
           MIN(date)            AS first_seen,
           MAX(date)            AS last_seen,
           SUM(on_sale)         AS sale_count
    FROM items
    WHERE 1=1
  `;
  const bindings: (string | number)[] = [];

  if (category) {
    sql += ` AND category = ?`;
    bindings.push(category);
  }
  if (search) {
    sql += ` AND name LIKE ?`;
    bindings.push(`%${search.toUpperCase()}%`);
  }

  sql += ` GROUP BY name, category ORDER BY ${sort} ${order}`;

  const rows = db.prepare(sql).all(...bindings) as {
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
  }[];

  // Also return distinct categories for filter dropdown
  const categories = (
    db.prepare(`SELECT DISTINCT category FROM items ORDER BY category ASC`).all() as {
      category: string;
    }[]
  ).map((r) => r.category);

  return Response.json({ items: rows, categories });
}
