import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const INITIAL_EMPLOYEE_PASSWORD = "0000";

export function createPasswordSalt() {
  return randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

export function verifyPassword(password: string, salt?: string | null, hash?: string | null) {
  if (!salt || !hash) return password === INITIAL_EMPLOYEE_PASSWORD;
  const expected = Buffer.from(hash, "hex");
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function passwordIsAcceptable(password: string) {
  return password.trim().length >= 4;
}
