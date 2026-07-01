import { SECRET_VERSION } from './constants.js';
import type { SecretMeta, SecretPayload } from './types.js';
import { toArrayBuffer, bytesToBase64, dtm, base64ToBytes } from './utils.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function encryptSecret(plainText: string, password: string, meta: SecretMeta): Promise<SecretPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password);
  const encoded = textEncoder.encode(plainText);
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    key,
    encoded,
  );
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);
  const cipherBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);

  return {
    v: SECRET_VERSION,
    ...meta,
    encrypted: `${bytesToBase64(iv)}:${bytesToBase64(tag)}:${bytesToBase64(cipherBytes)}`,
    date: dtm(new Date()),
  };
}

export async function decryptSecret(payload: SecretPayload, password: string): Promise<string> {
  const [ivText, tagText, encryptedText] = payload.encrypted.split(':');
  if (!ivText || !tagText || !encryptedText) {
    throw new Error('Invalid payload.');
  }

  const iv = base64ToBytes(ivText);
  const tag = base64ToBytes(tagText);
  const cipherBytes = base64ToBytes(encryptedText);
  const combined = new Uint8Array(cipherBytes.length + tag.length);
  combined.set(cipherBytes, 0);
  combined.set(tag, cipherBytes.length);

  const key = await deriveKey(password);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    key,
    combined,
  );

  return textDecoder.decode(decrypted);
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const passwordBytes = textEncoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', passwordBytes);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export function isEncrypted(block: string): SecretPayload | null {
  let o: SecretPayload | null = null;
  try {
    o = JSON.parse(block);
  } catch {}

  if (!o || !o.encrypted || !o.v || !o.date) {
    return null;
  }

  return o;
}
