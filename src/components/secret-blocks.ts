import type { SecretBlock, SecretPayload } from '../types.js';
import { isFooter, isHeader, SECRET_LANG } from '../consts.js';
import { t } from '../i18n/index.js';

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

export const renderPlainBlock = (el: HTMLElement, onEncrypt: () => void | Promise<void>): void => {
  el.empty();
  el.addClass('secret-notes-panel');

  const card = el.createDiv({ cls: 'secret-notes-card secret-notes-card--plain' });

  card.createDiv({ cls: 'secret-notes-card__badge secret-notes-card__badge--warning', text: t('未加密') });
  const actions = card.createDiv({ cls: 'secret-notes-card__actions' });
  actions.createEl('button', { cls: 'mod-cta', text: t('加密') }).addEventListener('click', onEncrypt);
};

export const renderEncryptedBlock = (
  el: HTMLElement,
  payload: SecretPayload,
  handlers: {
    onView: () => void | Promise<void>;
    onChangePassword: () => void | Promise<void>;
    onDecrypt: () => void | Promise<void>;
  },
): void => {
  el.empty();
  el.addClass('secret-notes-panel');

  const card = el.createDiv({ cls: 'secret-notes-card' });
  card.createDiv({ cls: 'secret-notes-card__badge secret-notes-card__badge--success', text: t('已加密') });

  if (payload.title) {
    card.createDiv({ cls: 'secret-notes-card__title', text: payload.title });
  }

  card.createDiv({ cls: 'secret-notes-card__meta', text: t('加密时间：$1', payload.date) });

  const actions = card.createDiv({ cls: 'secret-notes-card__actions' });
  actions.createEl('button', { text: t('更换密码') }).addEventListener('click', handlers.onChangePassword);
  actions.createEl('button', { text: t('永久解密') }).addEventListener('click', handlers.onDecrypt);
  actions.createEl('button', { cls: 'mod-cta', text: t('编辑') }).addEventListener('click', handlers.onView);
};
