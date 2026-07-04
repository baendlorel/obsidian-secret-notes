import type { SecretBlock, SecretPayload } from '../types.js';
import { isFooter, isHeader } from '../consts.js';
import { t } from '../i18n/index.js';
import { setTooltip } from 'obsidian';
import { lockIcon, unlockIcon } from '../assets/icons.js';

export const findSecretBlocks = (content: string, lang: string): SecretBlock[] => {
  const lines = content.split('\n');
  const blocks: SecretBlock[] = [];
  let offset = 0;
  let startLine = -1;
  let startOffset = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineOffset = offset;
    offset += line.length + 1;

    if (startLine === -1) {
      if (isHeader(line, lang)) {
        startLine = i;
        startOffset = lineOffset;
      }
      continue;
    }

    if (isFooter(line)) {
      const blockLines = lines.slice(startLine + 1, i);
      const endOffset = offset;
      blocks.push({
        from: startOffset,
        to: endOffset,
        lineStart: startLine,
        lineEnd: i,
        raw: content.slice(startOffset, endOffset),
        content: blockLines.join('\n'),
      });
      startLine = -1;
      startOffset = -1;
    }
  }

  return blocks;
};

export const serializeSecretFence = (entry: SecretPayload | string, lang: string): string =>
  `\`\`\`${lang}\n${typeof entry === 'string' ? entry : JSON.stringify(entry)}\n\`\`\`\n`;

export const renderPlainBlock = (
  el: HTMLElement,
  _source: string,
  { onEncrypt }: { onEncrypt: () => Promise<void> },
): void => {
  el.empty();
  el.addClass('secret-notes-panel');
  el.addClass('secret-notes-panel--plain');

  const card = el.createDiv({ cls: 'secret-notes-card secret-notes-card--plain' });
  setTooltip(card, t('点击以加密'), { delay: 50 });

  const title = card.createDiv({ cls: 'secret-notes-card__title secret-notes-card__plaintext' });
  unlockIcon(title);
  title.addEventListener('click', onEncrypt as EventListener);
};

export const renderEncryptedBlock = (
  el: HTMLElement,
  payload: SecretPayload,
  {
    onView,
  }: {
    onView: () => Promise<void>;
  },
): void => {
  el.empty();
  el.addClass('secret-notes-panel');

  const card = el.createDiv({ cls: 'secret-notes-card' });
  card.addEventListener('click', onView as EventListener);

  setTooltip(card, t('点击查看'), { delay: 50 });

  const title = card.createDiv({ cls: 'secret-notes-card__title' });
  lockIcon(title);
  if (payload.title) {
    title.createSpan({ text: payload.title });
  }
};
