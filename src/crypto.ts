import { SECRET_VERSION } from './constants';
import type { SecretMeta, SecretPayload } from './types';

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
    title: meta.title?.trim() || undefined,
    hint: meta.hint?.trim() || undefined,
    encrypted: `${bytesToBase64(iv)}:${bytesToBase64(tag)}:${bytesToBase64(cipherBytes)}`,
    date: formatDate(new Date()),
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

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
