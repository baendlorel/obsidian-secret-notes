import type { SecretNotesSettings } from './types.js';

export const DEFAULT_SETTINGS: SecretNotesSettings = {
  blockName: 'secret',
};

export const SECRET_VERSION = 1;
export const isHeader = (v: string, lang: string) => new RegExp(`^\`\`\`${lang}\\s*$`).test(v);
export const isFooter = (v: string) => /^```\s*$/.test(v);
