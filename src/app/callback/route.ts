import { NextResponse } from "next/server";
import {
  careemClientId,
  careemIdentity,
  careemRedirectUri,
} from "@/lib/careem-oauth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const error = requestUrl.searchParams.get("error");
  const cookies = request.headers.get("cookie") ?? "";
  const readCookie = (name: string) =>
    cookies
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  const verifier = readCookie("careem_pkce");
  const expectedState = readCookie("careem_oauth_state");
  if (error)
    return NextResponse.redirect(
      new URL(`/?careem_error=${encodeURIComponent(error)}`, requestUrl),
    );
  if (!code || !verifier || !state || state !== expectedState)
    return NextResponse.json(
      { error: "Invalid or expired Careem sign-in response" },
      { status: 400 },
    );
  const identity = await careemIdentity();
  const tokenResponse = await fetch(identity.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: careemClientId,
      redirect_uri: careemRedirectUri,
      code,
      code_verifier: decodeURIComponent(verifier),
    }),
    cache: "no-store",
  });
  const tokenText = await tokenResponse.text();
  let tokens: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  try {
    tokens = JSON.parse(tokenText);
  } catch {
    return NextResponse.json(
      {
        error: "Careem token endpoint returned an unreadable response",
        status: tokenResponse.status,
        detail: tokenText.slice(0, 240),
      },
      { status: 502 },
    );
  }
  if (!tokenResponse.ok || !tokens.access_token)
    return NextResponse.json(
      {
        error: tokens.error ?? "Careem token exchange failed",
        detail: tokens.error_description,
        status: tokenResponse.status,
      },
      { status: 502 },
    );
  const response = NextResponse.redirect(
    new URL("/?careem=connected", requestUrl),
  );
  const secure = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
  };
  response.cookies.set("careem_access_token", tokens.access_token, {
    ...secure,
    maxAge: tokens.expires_in ?? 3600,
  });
  if (tokens.refresh_token)
    response.cookies.set("careem_refresh_token", tokens.refresh_token, {
      ...secure,
      maxAge: 30 * 24 * 60 * 60,
    });
  response.cookies.delete("careem_pkce");
  response.cookies.delete("careem_oauth_state");
  return response;
}
