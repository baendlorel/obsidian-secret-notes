import { SECRET_VERSION } from './consts.js';
import type { EncryptArgs, NormalizedSecretPayload, SecretPayload } from './types.js';
import { toArrayBuffer, bytesToBase64, dtm, base64ToBytes } from './utils.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export async function encryptSecret(args: EncryptArgs): Promise<NormalizedSecretPayload> {
  const { plaintext, password, title, hint } = args;

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password);
  const encoded = textEncoder.encode(plaintext);
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
    title,
    hint,
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

export function parseSecretPayload(source: string): NormalizedSecretPayload | null {
  try {
    const { encrypted, v, date, title, hint } = JSON.parse(source) as SecretPayload;
    if (
      v !== SECRET_VERSION ||
      typeof encrypted !== 'string' ||
      typeof date !== 'string' ||
      (title !== undefined && typeof title !== 'string') ||
      (hint !== undefined && typeof hint !== 'string')
    ) {
      return null;
    }

    return {
      v,
      title: title?.trim() ?? '',
      hint: hint?.trim() ?? '',
      encrypted,
      date,
    };
  } catch {
    return null;
  }
}
