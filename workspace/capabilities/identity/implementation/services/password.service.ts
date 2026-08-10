import * as crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const SALT_SEPARATOR = "$";

export interface PasswordService {
  readonly kind: "service";
  readonly name: "identity.password";
  hash(password: string): string;
  verify(password: string, storedHash: string): boolean;
}

function scryptDerive(password: string, salt: Buffer): string {
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN) as Buffer;
  return `${salt.toString("hex")}${SALT_SEPARATOR}${derived.toString("hex")}`;
}

export const passwordService: PasswordService = Object.freeze({
  kind: "service",
  name: "identity.password",

  hash(password: string): string {
    const salt = crypto.randomBytes(SALT_BYTES);
    return scryptDerive(password, salt);
  },

  verify(password: string, storedHash: string): boolean {
    try {
      const [saltHex] = storedHash.split(SALT_SEPARATOR);
      if (!saltHex) return false;
      const salt = Buffer.from(saltHex, "hex");
      const expected = scryptDerive(password, salt);
      return crypto.timingSafeEqual(
        Buffer.from(expected, "utf8"),
        Buffer.from(storedHash, "utf8"),
      );
    } catch {
      return false;
    }
  },
});

export function hashPassword(password: string): string {
  return passwordService.hash(password);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return passwordService.verify(password, storedHash);
}
