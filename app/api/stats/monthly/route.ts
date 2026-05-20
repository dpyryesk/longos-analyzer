export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view") ?? "monthly"; // "monthly" | "yearly"
  const db = getDb();

  if (view === "yearly") {
    const rows = db
      .prepare(
        `SELECT strftime('%Y', timestamp) as period,
                SUM(total_amount) as total,
                COUNT(*) as trips
         FROM receipts
         GROUP BY period
         ORDER BY period ASC`
      )
      .all() as { period: string; total: number; trips: number }[];
    return Response.json(rows);
  }

  // Monthly view: last 24 months
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', timestamp) as period,
              SUM(total_amount) as total,
              COUNT(*) as trips
       FROM receipts
       GROUP BY period
       ORDER BY period ASC`
    )
    .all() as { period: string; total: number; trips: number }[];

  return Response.json(rows);
}
