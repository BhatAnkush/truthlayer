import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function getSecret(): string {
  const value =
    process.env.GROQ_KEY_ENCRYPTION_SECRET ??
    process.env.ENCRYPTION_SECRET ??
    process.env.CLERK_SECRET_KEY ??
    process.env.NEXTAUTH_SECRET ??
    "";

  if (!value.trim()) {
    throw new Error("encryption_secret_missing");
  }

  return value;
}

function getKeyBuffer(): Buffer {
  const secret = getSecret();
  return createHash("sha256").update(secret).digest();
}

export function encryptStoredKey(raw: string): string {
  const plaintext = raw.trim();
  if (!plaintext) return "";

  const key = getKeyBuffer();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptStoredKey(value: string | null | undefined): string | null {
  if (!value) return null;

  // Backward compatibility for previously stored plain keys.
  if (!value.startsWith(PREFIX)) {
    return value;
  }

  const payload = value.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("encrypted_key_invalid");
  }

  const key = getKeyBuffer();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
