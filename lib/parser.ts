export interface ParsedItem {
  name: string;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  onSale: boolean;
  hstApplicable: boolean;
}

export interface ParsedReceipt {
  invNumber: string;
  timestamp: string; // ISO datetime e.g. "2025-11-18T18:43:46"
  totalAmount: number;
  items: ParsedItem[];
}

// Category header: single leading space + ALL-CAPS word(s), nothing else
const CATEGORY_RE = /^ ([A-Z][A-Z ]+)$/;

// Item line: NAME <2+spaces> $PRICE <optional flags>
const ITEM_RE = /^([A-Z0-9][A-Z0-9 '.&/\-]{1,}?)\s{2,}\$(\d+\.\d{2})(.*)$/;

// Timestamp on header line: "#035-004 11/18/2025 18:43:46"
const TIMESTAMP_RE = /#\d{3}-\d{3}\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2}:\d{2})/;

// Invoice number
const INV_RE = /Inv#:(\d+)/;

// Total from credit card section block (most reliable)
const AMOUNT_CC_RE = /Amount\s*:\s*\$(\d+\.\d{2})/;

// Fallback: Total line from receipt body
const TOTAL_BODY_RE = /^Total\s+\$(\d+\.\d{2})/m;

// End-of-items markers
const END_OF_ITEMS_RE = /^Items Subtotal|^Subtotal|^H=HST|^Total\s+\[|^TOTAL\s+\[/;

// Weight-detail lines to skip, e.g. "2.265 kg @ $5.49/kg"
const WEIGHT_LINE_RE = /^\d+\.\d+\s*kg\s*@/;

export function parseReceipt(rawText: string): ParsedReceipt | null {
  const lines = rawText.split(/\r?\n/);

  // --- Invoice number ---
  let invNumber: string | null = null;
  for (const line of lines) {
    const m = INV_RE.exec(line);
    if (m) { invNumber = m[1]; break; }
  }
  if (!invNumber) {
    console.log("[parser] SKIP: no invoice number found in text (first 200 chars):", rawText.slice(0, 200));
    return null;
  }

  // --- Timestamp ---
  let timestamp: string | null = null;
  for (const line of lines) {
    const m = TIMESTAMP_RE.exec(line);
    if (m) {
      const [, mm, dd, yyyy, time] = m;
      timestamp = `${yyyy}-${mm}-${dd}T${time}`;
      break;
    }
  }
  if (!timestamp) {
    console.log(`[parser] SKIP inv#${invNumber}: no timestamp found`);
    return null;
  }

  const dateOnly = timestamp.slice(0, 10); // YYYY-MM-DD

  // --- Total amount ---
  let totalAmount: number | null = null;
  for (const line of lines) {
    const m = AMOUNT_CC_RE.exec(line);
    if (m) { totalAmount = parseFloat(m[1]); break; }
  }
  if (totalAmount === null) {
    const m = TOTAL_BODY_RE.exec(rawText);
    if (m) totalAmount = parseFloat(m[1]);
  }
  if (totalAmount === null) {
    console.log(`[parser] SKIP inv#${invNumber}: no total amount found`);
    return null;
  }

  // --- Items ---
  const items: ParsedItem[] = [];
  let currentCategory = "UNCATEGORIZED";
  let inItemSection = false;
  let nonMatchingLines = 0;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Category header detection
    const categoryMatch = CATEGORY_RE.exec(trimmed);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      inItemSection = true;
      continue;
    }

    // End of item section
    if (inItemSection && END_OF_ITEMS_RE.test(trimmed)) break;

    if (!inItemSection || !trimmed) continue;

    // Skip weight-detail lines
    if (WEIGHT_LINE_RE.test(trimmed)) continue;

    // Parse item line
    const itemMatch = ITEM_RE.exec(trimmed);
    if (itemMatch) {
      const [, rawName, priceStr, flags] = itemMatch;
      items.push({
        name: rawName.trim(),
        category: currentCategory,
        amount: parseFloat(priceStr),
        date: dateOnly,
        onSale: /SALE/.test(flags),
        hstApplicable: /\bH\b/.test(flags),
      });
    } else {
      nonMatchingLines++;
      if (nonMatchingLines <= 5) {
        console.log(`[parser] inv#${invNumber}: line in item section did not match item regex: ${JSON.stringify(trimmed)}`);
      }
    }
  }

  console.log(
    `[parser] inv#${invNumber} date=${dateOnly} total=$${totalAmount} items=${items.length} nonMatchingLines=${nonMatchingLines}`
  );
  return { invNumber, timestamp, totalAmount, items };
}
