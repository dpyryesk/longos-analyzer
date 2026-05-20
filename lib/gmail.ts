import { google } from "googleapis";

export interface EmailMessage {
  messageId: string;
  plainText: string;
}

/**
 * Fetch plain-text receipt emails from Gmail.
 * Returns up to maxResults emails matching the configured search query.
 */
export async function fetchReceiptEmails(
  auth: InstanceType<typeof google.auth.OAuth2>,
  maxResults = 10_000
): Promise<EmailMessage[]> {
  const gmail = google.gmail({ version: "v1", auth });
  const query = process.env.GMAIL_SEARCH_QUERY ?? "from:donotreply@longos.com";

  const fullQuery = `${query}`;

  console.log("[gmail] search query:", fullQuery);
  console.log("[gmail] maxResults cap:", maxResults);

  const results: EmailMessage[] = [];
  let pageToken: string | undefined;
  let pageNum = 0;

  do {
    pageNum++;
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: fullQuery,
      maxResults: Math.min(maxResults - results.length, 100),
      pageToken,
    });

    const messages = listRes.data.messages ?? [];
    pageToken = listRes.data.nextPageToken ?? undefined;
    console.log(
      `[gmail] page ${pageNum}: ${messages.length} message(s) listed, nextPageToken=${pageToken ?? "none"}`
    );

    for (const msg of messages) {
      if (!msg.id) {
        console.log("[gmail] skipping message with no id");
        continue;
      }
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const plainText = extractPlainText(detail.data);
      if (plainText) {
        console.log(
          `[gmail] message ${msg.id}: text extracted (${plainText.length} chars), preview: ${JSON.stringify(plainText.slice(0, 300))}`
        );
        results.push({ messageId: msg.id, plainText });
      } else {
        console.log(
          `[gmail] message ${msg.id}: NO extractable text — mimeType=${detail.data?.payload?.mimeType ?? "unknown"}, parts=${JSON.stringify((detail.data?.payload?.parts ?? []).map((p) => p.mimeType))}`
        );
      }

      if (results.length >= maxResults) break;
    }
  } while (pageToken && results.length < maxResults);

  console.log(`[gmail] fetchReceiptEmails done: ${results.length} email(s) with plain text`);
  return results;
}

// A MIME part as returned by the Gmail API (recursive structure).
type MimePart = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: MimePart[] | null;
};

/**
 * Recursively walk the MIME tree.
 * 1. Prefer the first text/plain part found anywhere in the tree.
 * 2. Fall back to the first text/html part, stripped of markup.
 */
function extractPlainText(message: { payload?: MimePart | null }): string | null {
  if (!message.payload) return null;

  const plain = findPartData(message.payload, "text/plain");
  if (plain) {
    console.log("[gmail] extractPlainText: found text/plain part");
    return plain;
  }

  const html = findPartData(message.payload, "text/html");
  if (html) {
    console.log(
      "[gmail] extractPlainText: no text/plain — falling back to text/html and stripping tags"
    );
    return htmlToText(html);
  }

  console.log("[gmail] extractPlainText: no text/plain or text/html found in MIME tree");
  return null;
}

/** Recursively find the first part matching `mimeType` and return its decoded body. */
function findPartData(part: MimePart, mimeType: string): string | null {
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const found = findPartData(child, mimeType);
    if (found) return found;
  }
  return null;
}

/**
 * Convert an HTML string to plain text suitable for the receipt parser.
 * - Strips <style>/<script> blocks
 * - Converts block-level elements to newlines
 * - Strips all remaining tags
 * - Decodes common HTML entities
 */
function htmlToText(html: string): string {
  return (
    html
      // Remove style and script blocks entirely
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      // Block elements → newline
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<td[^>]*>/gi, " ")
      // Strip all remaining tags
      .replace(/<[^>]+>/g, "")
      // Decode common HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Collapse excessive blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function decodeBase64(encoded: string): string {
  // Gmail uses URL-safe base64
  const fixed = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(fixed, "base64").toString("utf-8");
}
