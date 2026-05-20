import { google } from "googleapis";
import fs from "fs";
import path from "path";

const TOKENS_PATH = path.join(process.cwd(), "tokens.json");

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`
  );
}

export function loadTokens(): Record<string, unknown> | null {
  if (!fs.existsSync(TOKENS_PATH)) return null;
  try {
    const raw = fs.readFileSync(TOKENS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveTokens(tokens: Record<string, unknown>): void {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

export function getAuthenticatedClient() {
  const tokens = loadTokens();
  if (!tokens) return null;

  const client = getOAuthClient();
  client.setCredentials(tokens);
  return client;
}

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
