"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { normalizeBdPhone } from "@/lib/phone";
import { prisma } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import {
  generateOtp,
  hashOtp,
  verifyOtp as verifyOtpHash,
  verifyPassword,
} from "@/lib/crypto";
import { sendSms } from "@/lib/sms";
import { Role } from "@/generated/prisma/enums";

export type AuthState = {
  /** Translation key under the "Auth" namespace, or undefined when ok. */
  error?: string;
  /** Two-step phone flow: which step to show next. */
  step?: "phone" | "code";
  /** Normalized phone carried between steps. */
  phone?: string;
};

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

// --- Phone OTP ---------------------------------------------------------------

export async function requestOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const phone = normalizeBdPhone(String(formData.get("phone") ?? ""));
  if (!phone) return { step: "phone", error: "invalidPhone" };

  const code = generateOtp(6);
  // Invalidate any outstanding codes for this number, then issue a fresh one.
  await prisma.otpToken.updateMany({
    where: { phone, consumed: false },
    data: { consumed: true },
  });
  await prisma.otpToken.create({
    data: {
      phone,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendSms(phone, `Your BDShop verification code is ${code}`);
  return { step: "code", phone };
}

export async function verifyOtp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const phone = normalizeBdPhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  if (!phone) return { step: "phone", error: "invalidPhone" };
  if (!/^\d{6}$/.test(code)) return { step: "code", phone, error: "otpFormat" };

  const token = await prisma.otpToken.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return { step: "code", phone, error: "otpExpired" };

  if (token.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { consumed: true },
    });
    return { step: "phone", error: "otpTooMany" };
  }

  if (!verifyOtpHash(code, token.codeHash)) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    return { step: "code", phone, error: "otpInvalid" };
  }

  await prisma.otpToken.update({
    where: { id: token.id },
    data: { consumed: true },
  });

  const user = await prisma.user.upsert({
    where: { phone },
    update: { phoneVerified: new Date() },
    create: { phone, phoneVerified: new Date(), role: Role.CUSTOMER },
    select: { id: true, role: true },
  });

  await createSession({ userId: user.id, role: user.role });
  return redirect("/account");
}

/** Single entry point for the two-step phone form (useActionState). */
export async function phoneAuth(
  prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  return formData.get("intent") === "verify"
    ? verifyOtp(prev, formData)
    : requestOtp(prev, formData);
}

// --- Admin email + password --------------------------------------------------

const adminSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function adminLogin(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = adminSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalidCredentials" };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true, passwordHash: true },
  });

  // Uniform failure for unknown user / wrong password / non-admin.
  if (
    !user ||
    user.role !== Role.ADMIN ||
    !user.passwordHash ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    return { error: "invalidCredentials" };
  }

  await createSession({ userId: user.id, role: user.role });
  return redirect("/admin");
}

// --- Logout ------------------------------------------------------------------

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/");
}
