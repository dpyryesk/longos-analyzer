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
  /** Lines inside the item section that could not be matched to an item. */
  unmatchedLines: string[];
}

// Category header: single leading space + ALL-CAPS word(s), nothing else
const CATEGORY_RE = /^ ([A-Z][A-Z ]+)$/;

// Item line: NAME <2+spaces> $PRICE <optional flags>
// Line is normalised to uppercase before matching (handles HTML-entity artifacts
// like "&amp" from email encoding).
// Leading space is optional (some items are indented one space in the receipt).
// Name characters allowed: letters (incl. accented Latin \u00C0-\u00FF),
// digits, spaces, apostrophes, dots, ampersands, slashes, hyphens, commas,
// percent, plus, equals, double-quotes (inch marks), dollar signs (gift cards),
// square brackets (e.g. "RICE STICK [5MM]").
const ITEM_RE = /^ ?([A-Z0-9\u00C0-\u00FF][A-Z0-9\u00C0-\u00FF '.&/\-,%+"$=\[\]]{1,}?)\s{2,}\$(\d+\.\d{2})(.*)$/;

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

// Unit-price annotation preceding a multi-unit item, e.g.:
//   "2 @ $9.49 each"
//   "1 @ $7.99 each (2/$12.00)"
// Captures the per-unit price so the following item line uses it instead of
// the printed total.
const UNIT_PRICE_RE = /^\s*\d+\s*@\s*\$(\d+\.\d{2})\s+each/i;

// Informational / adjustment lines that appear inside the item section but are
// NOT purchaseable items — silently ignored (not added to unmatchedLines).
// Matched case-insensitively to catch both original and normalised-uppercase forms:
//   " TYR Member Savings: $1.50"   — loyalty discount
//   " Bonus points: 25"            — loyalty points note
//   " Multi-Save discount  -$1.97" — discount (negative price)
//   " Elect. Store coupon  -$3.50" — coupon discount (negative price)
//   "CPN: 25% OFF BBQ CHICKEN  H"  — coupon description
//   "CPN: BONUS POINTS"            — coupon description
//   "PLASTIC BAG"                  — non-priced annotation line
const KNOWN_SKIP_RE =
  /Member Savings:|Bonus points:|^\s*CPN:|-\$|^PLASTIC BAG/i;

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
  const unmatchedLines: string[] = [];
  let currentCategory = "UNCATEGORIZED";
  let inItemSection = false;
  let pendingUnitPrice: number | null = null;

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

    // Unit-price annotation: "2 @ $9.49 each" or "1 @ $7.99 each (2/$12.00)"
    // Store the per-unit price; the very next item line will use it instead of
    // the printed total.
    const unitPriceMatch = UNIT_PRICE_RE.exec(trimmed);
    if (unitPriceMatch) {
      pendingUnitPrice = parseFloat(unitPriceMatch[1]);
      continue;
    }

    // Skip other known informational lines
    if (KNOWN_SKIP_RE.test(trimmed)) continue;

    // Normalise to uppercase so that HTML-entity artifacts (e.g. "&amp" from
    // email encoding) and any mixed-case line content are handled uniformly.
    const normalised = trimmed.toUpperCase();

    // Parse item line
    const itemMatch = ITEM_RE.exec(normalised);
    if (itemMatch) {
      const [, rawName, priceStr, flags] = itemMatch;
      const unitPrice = pendingUnitPrice ?? parseFloat(priceStr);
      pendingUnitPrice = null;
      items.push({
        name: rawName.trim(),
        category: currentCategory,
        amount: unitPrice,
        date: dateOnly,
        onSale: /SALE/.test(flags),
        hstApplicable: /\bH\b/.test(flags),
      });
    } else {
      pendingUnitPrice = null;
      unmatchedLines.push(trimmed);
    }
  }

  console.log(
    `[parser] inv#${invNumber} date=${dateOnly} total=$${totalAmount} items=${items.length} unmatchedLines=${unmatchedLines.length}`
  );
  return { invNumber, timestamp, totalAmount, items, unmatchedLines };
}
