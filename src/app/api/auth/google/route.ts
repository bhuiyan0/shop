import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState, generateCodeVerifier } from "arctic";
import {
  googleClient,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
} from "@/lib/auth/google";

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = googleClient().createAuthorizationURL(state, codeVerifier, [
    "openid",
    "profile",
    "email",
  ]);

  const store = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10, // 10 minutes to complete the handshake
  };
  store.set(GOOGLE_STATE_COOKIE, state, cookieOpts);
  store.set(GOOGLE_VERIFIER_COOKIE, codeVerifier, cookieOpts);

  return NextResponse.redirect(url);
}
