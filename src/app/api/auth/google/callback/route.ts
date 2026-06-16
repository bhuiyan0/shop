import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { decodeIdToken, OAuth2RequestError } from "arctic";
import {
  googleClient,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  type GoogleClaims,
} from "@/lib/auth/google";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

function errorRedirect(req: NextRequest, reason: string) {
  const url = new URL("/login", req.nextUrl.origin);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const store = await cookies();
  const storedState = store.get(GOOGLE_STATE_COOKIE)?.value;
  const codeVerifier = store.get(GOOGLE_VERIFIER_COOKIE)?.value;

  // Clear the handshake cookies regardless of outcome.
  store.delete(GOOGLE_STATE_COOKIE);
  store.delete(GOOGLE_VERIFIER_COOKIE);

  if (!code || !state || !storedState || !codeVerifier) {
    return errorRedirect(req, "oauth_invalid");
  }
  if (state !== storedState) {
    return errorRedirect(req, "oauth_state");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await googleClient().validateAuthorizationCode(
      code,
      codeVerifier,
    );
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch (e) {
    if (e instanceof OAuth2RequestError) return errorRedirect(req, "oauth_code");
    throw e;
  }

  if (!claims.email) {
    return errorRedirect(req, "oauth_no_email");
  }

  // Link by existing Google account, else by verified email, else create.
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: claims.sub,
      },
    },
    select: { userId: true },
  });

  let userId: string;
  let role;

  if (existingAccount) {
    userId = existingAccount.userId;
    const u = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { role: true },
    });
    role = u.role;
  } else {
    const user = await prisma.user.upsert({
      where: { email: claims.email },
      update: {
        name: claims.name ?? undefined,
        image: claims.picture ?? undefined,
        emailVerified: new Date(),
      },
      create: {
        email: claims.email,
        name: claims.name,
        image: claims.picture,
        emailVerified: new Date(),
      },
      select: { id: true, role: true },
    });
    userId = user.id;
    role = user.role;

    await prisma.account.create({
      data: {
        userId,
        type: "oidc",
        provider: "google",
        providerAccountId: claims.sub,
      },
    });
  }

  await createSession({ userId, role });
  return NextResponse.redirect(new URL("/", req.nextUrl.origin));
}
