import { MarkdownRenderChild, Notice, setTooltip } from 'obsidian';
import type { NormalizedSecretImagePayload } from '../types.js';
import { t } from '../i18n/index.js';
import { secondClickConfirm } from '../utils.js';
import { unlockIcon } from '../assets/icons.js';

const watermark = (card: HTMLElement): void => {
  card.createDiv({
    cls: 'kasukabe-watermark__secret-notes',
    text: `v__VERSION__ © 2026 Kasukabe Tsumugi.`,
  });
};

/** Empty secretimage block: warning card that opens a file picker. */
export const renderEmptyImageBlock = (
  el: HTMLElement,
  { onAdd }: { onAdd: (file: File) => void },
): void => {
  el.empty();
  el.addClass('secret-notes-panel');

  const card = el.createDiv({ cls: 'secret-notes-card secret-notes-card--plain secret-notes-card--warning' });
  setTooltip(card, t('点击添加图片'), { delay: 50 });

  const title = card.createDiv({ cls: 'secret-notes-card__title secret-notes-card__plaintext' });
  unlockIcon(title);
  title.createSpan({ text: t('添加加密图片') });

  const input = el.createEl('input', { attr: { type: 'file', accept: 'image/*' } });
  input.style.display = 'none';
  card.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = ''; // allow picking the same file again
    if (file) {
      onAdd(file);
    }
  });

  watermark(card);
};

/** Non-empty block whose JSON failed validation; no actions to avoid clobbering it. */
export const renderBrokenImageBlock = (el: HTMLElement): void => {
  el.empty();
  el.addClass('secret-notes-panel');

  const card = el.createDiv({ cls: 'secret-notes-card secret-notes-card--warning' });
  const title = card.createDiv({ cls: 'secret-notes-card__title secret-notes-card__plaintext' });
  title.createSpan({ text: t('无法解析此加密图片块') });

  watermark(card);
};

/** Decrypted state: inline image + action bar. */
export const renderUnlockedImageBlock = (
  el: HTMLElement,
  payload: NormalizedSecretImagePayload,
  handlers: { blobUrl: string; onRelock: () => void; onExport: () => void },
): void => {
  el.empty();
  el.addClass('secret-notes-panel');

  const card = el.createDiv({ cls: 'secret-notes-card secret-notes-card--image' });

  const img = card.createEl('img', {
    cls: 'secret-notes-card__image',
    attr: { src: handlers.blobUrl, alt: payload.title || t('加密图片') },
  });
  img.addEventListener('error', () => new Notice(t('图片渲染失败')));

  const actions = card.createDiv({ cls: 'secret-notes-card__actions' });

  const relockBtn = actions.createEl('button', { text: t('重新上锁') });
  relockBtn.setAttr('type', 'button');
  relockBtn.addEventListener('click', handlers.onRelock);

  const exportBtn = actions.createEl('button', { text: t('永久解密'), cls: 'mod-warning' });
  exportBtn.setAttr('type', 'button');
  secondClickConfirm(exportBtn, t('确认永久解密'), () => handlers.onExport());

  watermark(card);
};

/** Revokes the blob URL when the block leaves the DOM (rerender / close / unload). */
export class SecretImageRenderChild extends MarkdownRenderChild {
  private readonly revoke: () => void;

  constructor(containerEl: HTMLElement, revoke: () => void) {
    super(containerEl);
    this.revoke = revoke;
  }

  override onunload(): void {
    this.revoke();
  }
}
