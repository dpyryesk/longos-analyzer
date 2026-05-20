import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "receipts.db");

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _db = new DatabaseSync(DB_PATH, { enableForeignKeyConstraints: true });
  // WAL mode for better concurrent read performance
  _db.exec("PRAGMA journal_mode = WAL");

  initSchema(_db);
  return _db;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id               INTEGER  PRIMARY KEY AUTOINCREMENT,
      inv_number       TEXT     UNIQUE NOT NULL,
      email_message_id TEXT     UNIQUE,
      timestamp        DATETIME NOT NULL,
      total_amount     REAL     NOT NULL,
      raw_text         TEXT,
      synced_at        DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id               INTEGER  PRIMARY KEY AUTOINCREMENT,
      receipt_id       INTEGER  NOT NULL REFERENCES receipts(id),
      name             TEXT     NOT NULL,
      category         TEXT     NOT NULL,
      amount           REAL     NOT NULL,
      date             DATE     NOT NULL,
      on_sale          INTEGER  DEFAULT 0,
      hst_applicable   INTEGER  DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_items_name     ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
    CREATE INDEX IF NOT EXISTS idx_items_date     ON items(date);
    CREATE INDEX IF NOT EXISTS idx_receipts_timestamp ON receipts(timestamp);
  `);
}

export interface Receipt {
  id: number;
  inv_number: string;
  email_message_id: string | null;
  timestamp: string;
  total_amount: number;
  raw_text: string | null;
  synced_at: string;
}

export interface Item {
  id: number;
  receipt_id: number;
  name: string;
  category: string;
  amount: number;
  date: string;
  on_sale: number;
  hst_applicable: number;
}
