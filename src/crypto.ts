import { SECRET_VERSION, SUPPORTED_IMAGE_EXTS } from './consts.js';
import type {
  EncryptArgs,
  NormalizedSecretImagePayload,
  NormalizedSecretPayload,
  SecretImageInfo,
  SecretImagePayload,
  SecretPayload,
} from './types.js';
import { toArrayBuffer, bytesToBase64, base64ToBytes } from './utils.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface EncryptedParts {
  iv: string;
  tag: string;
  cipher: string;
}

/** Encrypt raw bytes; both text and image payloads go through here. */
export const encryptBytes = async (data: ArrayBuffer, password: string): Promise<EncryptedParts> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password);
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    key,
    data,
  );
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const tag = encryptedBytes.slice(encryptedBytes.length - 16);
  const cipherBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);

  return {
    iv: bytesToBase64(iv),
    tag: bytesToBase64(tag),
    cipher: bytesToBase64(cipherBytes),
  };
};

export const decryptBytes = async (parts: EncryptedParts, password: string): Promise<ArrayBuffer> => {
  const iv = base64ToBytes(parts.iv);
  const tag = base64ToBytes(parts.tag);
  const cipherBytes = base64ToBytes(parts.cipher);
  const combined = new Uint8Array(cipherBytes.length + tag.length);
  combined.set(cipherBytes, 0);
  combined.set(tag, cipherBytes.length);

  const key = await deriveKey(password);
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
    },
    key,
    combined,
  );
};

export const serializeEncryptedParts = (parts: EncryptedParts): string =>
  `${parts.iv}:${parts.tag}:${parts.cipher}`;

export const parseEncryptedParts = (text: string): EncryptedParts | null => {
  const segments = text.split(':');
  if (segments.length !== 3) {
    return null;
  }

  const [iv, tag, cipher] = segments;
  if (!iv || !tag || !cipher) {
    return null;
  }

  try {
    atob(iv);
    atob(tag);
    atob(cipher);
  } catch {
    return null;
  }

  return { iv, tag, cipher };
};

export const encryptSecret = async (args: EncryptArgs): Promise<NormalizedSecretPayload> => {
  const { plaintext, password, title, hint } = args;
  const parts = await encryptBytes(toArrayBuffer(textEncoder.encode(plaintext)), password);

  return {
    v: SECRET_VERSION,
    title,
    hint,
    encrypted: serializeEncryptedParts(parts),
    date: new Date().toISOString(),
  };
};

export const decryptSecret = async (payload: SecretPayload, password: string): Promise<string> => {
  const parts = parseEncryptedParts(payload.encrypted);
  if (!parts) {
    throw new Error('Invalid payload.');
  }

  const decrypted = await decryptBytes(parts, password);
  return textDecoder.decode(decrypted);
};

const deriveKey = async (password: string): Promise<CryptoKey> => {
  const passwordBytes = textEncoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', passwordBytes);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

export const parseSecretPayload = (source: string): NormalizedSecretPayload | null => {
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
};

const SECRETIMAGE_NAME_RE = /^[A-Za-z0-9-]+\.secretimg$/;

export const parseSecretImagePayload = (source: string): NormalizedSecretImagePayload | null => {
  try {
    const { v, date, title, hint, image } = JSON.parse(source) as SecretImagePayload;
    const imageInfo = image as SecretImageInfo | null | undefined;

    if (
      v !== SECRET_VERSION ||
      typeof date !== 'string' ||
      (title !== undefined && typeof title !== 'string') ||
      (hint !== undefined && typeof hint !== 'string') ||
      !imageInfo ||
      typeof imageInfo.name !== 'string' ||
      typeof imageInfo.ext !== 'string' ||
      !SECRETIMAGE_NAME_RE.test(imageInfo.name) ||
      !SUPPORTED_IMAGE_EXTS.includes(imageInfo.ext)
    ) {
      return null;
    }

    return {
      v,
      title: title?.trim() ?? '',
      hint: hint?.trim() ?? '',
      date,
      image: { name: imageInfo.name, ext: imageInfo.ext },
    };
  } catch {
    return null;
  }
};
