import "server-only";
import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;

/** Hash a password with scrypt. Returns "salt:hash" (both hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LEN);
  return `${salt}:${derived.toString("hex")}`;
}

/** Verify a password against a stored "salt:hash" string in constant time. */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = await scrypt(password, salt, KEY_LEN);
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

// OTP codes are short-lived 6-digit values; an HMAC keyed with AUTH_SECRET is
// enough to stop the DB from leaking plaintext codes, without scrypt's cost.
function otpKey(): string {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET is not set");
  return key;
}

export function hashOtp(code: string): string {
  return createHmac("sha256", otpKey()).update(code).digest("hex");
}

export function verifyOtp(code: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashOtp(code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

/** Generate a cryptographically-random numeric OTP of the given length. */
export function generateOtp(digits = 6): string {
  const max = 10 ** digits;
  // rejection-free: read enough entropy then mod (bias negligible for 6 digits)
  const n = parseInt(randomBytes(6).toString("hex"), 16) % max;
  return n.toString().padStart(digits, "0");
}
