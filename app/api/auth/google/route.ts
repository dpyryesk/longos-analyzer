import { getOAuthClient, GMAIL_SCOPES } from "@/lib/auth";

export async function GET() {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
  });
  return Response.redirect(url);
}
