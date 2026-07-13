import { createHmac, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
const KEY_LENGTH = 64;

function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
  });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, saltValue, expectedValue] = encoded.split("$");
  if (algorithm !== "scrypt" || !n || !r || !p || !saltValue || !expectedValue) return false;
  const expected = Buffer.from(expectedValue, "base64url");
  const actual = await scrypt(password, Buffer.from(saltValue, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string, pepper: string): string {
  return createHmac("sha256", pepper).update(token).digest("hex");
}
