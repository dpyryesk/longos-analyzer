import type { NextRequest } from "next/server";
import { getOAuthClient, saveTokens } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?auth_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?auth_error=no_code`
    );
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  saveTokens(tokens as Record<string, unknown>);

  return Response.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}/?auth_success=1`
  );
}
