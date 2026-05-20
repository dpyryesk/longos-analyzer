import { getAuthenticatedClient } from "@/lib/auth";
import { fetchReceiptEmails } from "@/lib/gmail";
import { parseReceipt } from "@/lib/parser";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  console.log("[sync] POST /api/sync called");
  const client = getAuthenticatedClient();
  if (!client) {
    console.log("[sync] no authenticated client — returning 401");
    return Response.json(
      { error: "not_authenticated", redirect: "/api/auth/google" },
      { status: 401 }
    );
  }

  try {
    console.log("[sync] fetching receipt emails from Gmail…");
    const emails = await fetchReceiptEmails(client);
    console.log(`[sync] fetchReceiptEmails returned ${emails.length} email(s)`);
    const db = getDb();

    const insertReceipt = db.prepare(`
      INSERT OR IGNORE INTO receipts
        (inv_number, email_message_id, timestamp, total_amount, raw_text)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO items
        (receipt_id, name, category, amount, date, on_sale, hst_applicable)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const getReceipt = db.prepare(
      `SELECT id FROM receipts WHERE inv_number = ?`
    );

    let added = 0;
    let skipped = 0;
    let failed = 0;

    db.exec("BEGIN");
    try {
      for (const email of emails) {
        console.log(`[sync] parsing email messageId=${email.messageId}`);
        const parsed = parseReceipt(email.plainText);
        if (!parsed) {
          console.log(`[sync] messageId=${email.messageId}: parse returned null — incrementing failed`);
          failed++;
          continue;
        }
        console.log(`[sync] messageId=${email.messageId}: parsed inv#${parsed.invNumber} with ${parsed.items.length} item(s)`);

        const result = insertReceipt.run(
          parsed.invNumber,
          email.messageId,
          parsed.timestamp,
          parsed.totalAmount,
          email.plainText
        );
        console.log(`[sync] insertReceipt inv#${parsed.invNumber}: changes=${result.changes}`);

        if (Number(result.changes) === 0) {
          // Duplicate — already in DB
          console.log(`[sync] inv#${parsed.invNumber}: duplicate, skipping`);
          skipped++;
          continue;
        }

        const row = getReceipt.get(parsed.invNumber) as { id: number } | undefined;
        if (!row) {
          console.log(`[sync] inv#${parsed.invNumber}: could not retrieve inserted row — failing`);
          failed++;
          continue;
        }
        const receiptId = row.id;
        console.log(`[sync] inv#${parsed.invNumber}: receiptId=${receiptId}, inserting ${parsed.items.length} item(s)`);

        for (const item of parsed.items) {
          insertItem.run(
            receiptId,
            item.name,
            item.category,
            item.amount,
            item.date,
            item.onSale ? 1 : 0,
            item.hstApplicable ? 1 : 0
          );
        }

        added++;
      }
      db.exec("COMMIT");
    } catch (innerErr) {
      db.exec("ROLLBACK");
      throw innerErr;
    }

    const summary = { added, skipped, failed, total: emails.length };
    console.log("[sync] complete:", summary);
    return Response.json(summary);
  } catch (err) {
    console.error("Sync error:", err);
    return Response.json(
      { error: "sync_failed", message: String(err) },
      { status: 500 }
    );
  }
}
