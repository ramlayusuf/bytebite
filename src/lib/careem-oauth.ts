import "server-only";

export const careemClientId = process.env.CAREEM_CLIENT_ID ?? "";
export const careemRedirectUri =
  process.env.CAREEM_REDIRECT_URI ?? "http://localhost:3000/callback";

export async function careemIdentity() {
  const response = await fetch(
    "https://identity.careem.com/.well-known/openid-configuration",
    { cache: "no-store" },
  );
  if (!response.ok)
    throw new Error(`Careem Identity discovery failed (${response.status})`);
  return response.json() as Promise<{
    authorization_endpoint: string;
    token_endpoint: string;
  }>;
}

export function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export function randomUrlSafe(size = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}
