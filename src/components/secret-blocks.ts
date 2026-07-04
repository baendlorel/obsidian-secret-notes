import type { SecretBlock, SecretPayload } from '../types.js';
import { isFooter, isHeader, SECRET_LANG } from '../consts.js';
import { t } from '../i18n/index.js';
import { setTooltip } from 'obsidian';

export const findSecretBlocks = (content: string): SecretBlock[] => {
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
      if (isHeader(line)) {
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

export const serializeSecretFence = (entry: SecretPayload | string): string =>
  `\`\`\`${SECRET_LANG}\n${typeof entry === 'string' ? entry : JSON.stringify(entry)}\n\`\`\`\n`;

export const renderPlainBlock = (
  el: HTMLElement,
  source: string,
  { onEncrypt }: { onEncrypt: () => Promise<void> },
): void => {
  el.empty();
  el.addClass('secret-notes-panel');

  const card = el.createDiv({ cls: 'secret-notes-card secret-notes-card--plain secret-notes-card__bg--warning' });
  card.createDiv({ cls: 'secret-notes-card__badge secret-notes-card__badge--warning', text: t('未加密') });

  card
    .createDiv({ cls: 'secret-notes-card__actions' })
    .createEl('button', { cls: 'mod-cta', text: t('加密') })
    .addEventListener('click', onEncrypt as EventListener);
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

  setTooltip(card, t('点击以查看/编辑'), { delay: 50 });

  if (payload.title) {
    card.createDiv({ cls: 'secret-notes-card__title', text: payload.title });
  }
};
