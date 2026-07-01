import { getLanguage } from 'obsidian';
import { dict } from './dict.js';

// zh zh-TW
const getText = (lang: string, key: keyof typeof dict) => {
  if (lang === 'zh' || lang === 'zh-TW') {
    return key;
  } else {
    return dict[key];
  }
};

export const t = (key: keyof typeof dict, ...args: unknown[]): string => {
  let text = getText(getLanguage(), key);
  for (let i = 0; i < args.length; i++) {
    text = text.replace(`$${i + 1}`, String(args[i]));
  }
  return text;
};
