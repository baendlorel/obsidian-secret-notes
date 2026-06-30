import { FOOTER_PATTERN, HEADER_PATTERN, SECRET_VERSION } from './constants';
import type { SecretBlock, SecretPayload } from './types';

export function findSecretBlocks(content: string): SecretBlock[] {
  const lines = content.split('\n');
  const blocks: SecretBlock[] = [];
  let offset = 0;
  let startLine = -1;
  let startOffset = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineOffset = offset;
    offset += line.length + 1;

    if (startLine === -1) {
      if (HEADER_PATTERN.test(line)) {
        startLine = index;
        startOffset = lineOffset;
      }
      continue;
    }

    if (FOOTER_PATTERN.test(line)) {
      const blockLines = lines.slice(startLine + 1, index);
      const endOffset = offset;
      blocks.push({
        from: startOffset,
        to: endOffset,
        raw: content.slice(startOffset, endOffset),
        content: blockLines.join('\n'),
      });
      startLine = -1;
      startOffset = -1;
    }
  }

  return blocks;
}

export function parseSecretPayload(source: string): SecretPayload | null {
  try {
    const parsed = JSON.parse(source) as Partial<SecretPayload>;
    if (
      parsed.v !== SECRET_VERSION ||
      typeof parsed.encrypted !== 'string' ||
      typeof parsed.date !== 'string' ||
      (parsed.title !== undefined && typeof parsed.title !== 'string') ||
      (parsed.hint !== undefined && typeof parsed.hint !== 'string')
    ) {
      return null;
    }

    return {
      v: parsed.v,
      title: parsed.title?.trim() || undefined,
      hint: parsed.hint?.trim() || undefined,
      encrypted: parsed.encrypted,
      date: parsed.date,
    };
  } catch {
    return null;
  }
}

export function serializeSecretFence(payload: SecretPayload): string {
  return `\`\`\`secret\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
}

export function renderPlainPlaceholder(el: HTMLElement): void {
  el.empty();
  el.addClass('secret-notes-panel');
  const card = el.createDiv({ cls: 'secret-notes-card secret-notes-card--plain' });
  card.createDiv({ cls: 'secret-notes-card__badge', text: '待加密' });
  card.createDiv({
    cls: 'secret-notes-card__meta',
    text: '切换到预览模式或保存文件时，这个代码块会要求输入密码并转为密文。',
  });
}
