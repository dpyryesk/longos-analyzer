/**
 * scripts/reparse.ts
 *
 * Re-parses every receipt stored in the `receipts` table from its `raw_text`
 * and rebuilds the `items` table from scratch.
 *
 * Usage:
 *   pnpm reparse          (via the "reparse" npm script)
 *   npx tsx scripts/reparse.ts
 *
 * Receipts that fail to parse entirely, and individual item lines that the
 * parser could not match, are written to `failed-receipts.txt` in the project
 * root.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { parseReceipt } from "@/lib/parser";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "receipts.db");
const FAILED_OUTPUT = path.join(process.cwd(), "failed-receipts.txt");

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database not found at: ${DB_PATH}`);
  process.exit(1);
}

interface ReceiptRow {
  id: number;
  inv_number: string;
  raw_text: string | null;
}

const db = new DatabaseSync(DB_PATH);

// ── Step 1: wipe items ──────────────────────────────────────────────────────
console.log("Deleting all rows from `items`…");
db.exec("DELETE FROM items");
// Reset the autoincrement counter so IDs start fresh
db.exec("DELETE FROM sqlite_sequence WHERE name = 'items'");
console.log("Done.\n");

// ── Step 2: load all receipts ───────────────────────────────────────────────
const receipts = db
  .prepare("SELECT id, inv_number, raw_text FROM receipts ORDER BY id")
  .all() as ReceiptRow[];

console.log(`Found ${receipts.length} receipt(s) to re-parse.\n`);

const insertItem = db.prepare(`
  INSERT INTO items (receipt_id, name, category, amount, date, on_sale, hst_applicable)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

/** Sections written to failed-receipts.txt. */
const failedSections: string[] = [];

let succeeded = 0;
let failed = 0;
let withWarnings = 0;

// ── Step 3: re-parse and insert ─────────────────────────────────────────────
db.exec("BEGIN");
try {
  for (const receipt of receipts) {
    const label = `inv#${receipt.inv_number} (db id=${receipt.id})`;

    if (!receipt.raw_text) {
      console.warn(`[SKIP] ${label}: no raw_text stored`);
      failedSections.push(`=== ${label} ===\nReason: no raw_text stored\n`);
      failed++;
      continue;
    }

    const parsed = parseReceipt(receipt.raw_text);

    if (!parsed) {
      console.warn(`[FAIL] ${label}: parseReceipt returned null`);
      failedSections.push(
        `=== ${label} ===\nReason: parseReceipt returned null\n\n${receipt.raw_text}\n`
      );
      failed++;
      continue;
    }

    for (const item of parsed.items) {
      insertItem.run(
        receipt.id,
        item.name,
        item.category,
        item.amount,
        item.date,
        item.onSale ? 1 : 0,
        item.hstApplicable ? 1 : 0
      );
    }

    if (parsed.unmatchedLines.length > 0) {
      console.warn(
        `[WARN] ${label}: ${parsed.unmatchedLines.length} unmatched line(s) in item section`
      );
      const lineList = parsed.unmatchedLines
        .map((l, i) => `  ${i + 1}. ${JSON.stringify(l)}`)
        .join("\n");
      failedSections.push(
        `=== ${label} — unmatched item lines ===\n${lineList}\n`
      );
      withWarnings++;
    }

    console.log(`[OK]   ${label}: ${parsed.items.length} item(s) inserted`);
    succeeded++;
  }

  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Fatal error during re-parse — rolled back all changes:", err);
  process.exit(1);
}

// ── Step 4: write failures / warnings report ────────────────────────────────
if (failedSections.length > 0) {
  const report = failedSections.join("\n" + "-".repeat(72) + "\n\n");
  fs.writeFileSync(FAILED_OUTPUT, report, "utf-8");
  console.log(`\n⚠  Issues found — details written to: ${FAILED_OUTPUT}`);
} else {
  // Remove a stale failure file if everything now succeeds without warnings
  if (fs.existsSync(FAILED_OUTPUT)) fs.unlinkSync(FAILED_OUTPUT);
  console.log("\n✓  All receipts parsed successfully — no failures or warnings.");
}

console.log(
  `\nSummary: ${succeeded} succeeded (${withWarnings} with unmatched lines),` +
  ` ${failed} failed, ${receipts.length} total.`
);
