import "server-only";
import { Google } from "arctic";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Google OAuth client (arctic). Redirect URI is fixed to our callback route. */
export function googleClient(): Google {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new Google(
    required("AUTH_GOOGLE_ID"),
    required("AUTH_GOOGLE_SECRET"),
    `${appUrl}/api/auth/google/callback`,
  );
}

export interface GoogleClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

// Cookie names for the OAuth handshake (state + PKCE verifier).
export const GOOGLE_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_VERIFIER_COOKIE = "google_code_verifier";
