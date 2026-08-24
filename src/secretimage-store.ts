import { normalizePath, type Vault } from 'obsidian';
import { SECRETIMAGE_DIR, SECRETIMAGE_EXT, SECRETIMAGE_LANG } from './consts.js';
import {
  parseSecretImagePayload,
  serializeEncryptedParts,
  type EncryptedParts,
} from './crypto.js';
import { findSecretBlocks } from './components/secret-blocks.js';

export const secretImageFilePath = (name: string): string =>
  normalizePath(`${SECRETIMAGE_DIR}/${name}`);

export const ensureSecretImageDir = async (vault: Vault): Promise<void> => {
  if (vault.getFolderByPath(SECRETIMAGE_DIR)) {
    return;
  }
  try {
    await vault.createFolder(SECRETIMAGE_DIR);
  } catch {
    // lost the race: the folder was created concurrently
  }
};

/** Read the `iv:tag:cipher` text; throws when the file is missing. */
export const readSecretImageFile = async (vault: Vault, name: string): Promise<string> => {
  const file = vault.getFileByPath(secretImageFilePath(name));
  if (!file) {
    throw new Error(`secret image file not found: ${name}`);
  }
  return vault.cachedRead(file);
};

/** Write the ciphertext into `.secretimage/<uuid>.secretimg` and return the file name. */
export const writeSecretImageFile = async (vault: Vault, parts: EncryptedParts): Promise<string> => {
  await ensureSecretImageDir(vault);
  const name = `${crypto.randomUUID()}${SECRETIMAGE_EXT}`;
  await vault.create(secretImageFilePath(name), serializeEncryptedParts(parts));
  return name;
};

/** Move the ciphertext to `.trash/` (recoverable); missing files are ignored. */
export const trashSecretImageFile = async (vault: Vault, name: string): Promise<void> => {
  const file = vault.getFileByPath(secretImageFilePath(name));
  if (file) {
    await vault.trash(file, false);
  }
};

/** Count how many secretimage blocks across the vault reference the given file. */
export const countSecretImageReferences = async (vault: Vault, name: string): Promise<number> => {
  let count = 0;
  for (const file of vault.getMarkdownFiles()) {
    const content = await vault.cachedRead(file);
    for (const block of findSecretBlocks(content, SECRETIMAGE_LANG)) {
      if (parseSecretImagePayload(block.content)?.image.name === name) {
        count += 1;
      }
    }
  }
  return count;
};
