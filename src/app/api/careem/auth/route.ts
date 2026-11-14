import { NextResponse } from "next/server";
import {
  careemClientId,
  careemIdentity,
  careemRedirectUri,
  pkceChallenge,
  randomUrlSafe,
} from "@/lib/careem-oauth";

export async function GET() {
  if (!careemClientId)
    return NextResponse.json(
      { error: "CAREEM_CLIENT_ID is not configured" },
      { status: 500 },
    );
  const identity = await careemIdentity();
  const verifier = randomUrlSafe(48);
  const state = randomUrlSafe(24);
  const url = new URL(identity.authorization_endpoint);
  url.search = new URLSearchParams({
    client_id: careemClientId,
    redirect_uri: careemRedirectUri,
    response_type: "code",
    scope: "openid profile xcma",
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: "S256",
    state,
  }).toString();
  const response = NextResponse.redirect(url);
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: false,
    path: "/",
    maxAge: 600,
  };
  response.cookies.set("careem_pkce", verifier, options);
  response.cookies.set("careem_oauth_state", state, options);
  return response;
}
