import { Modal } from 'obsidian';
import { t } from '../i18n/index.js';

export class ConfirmModal extends Modal {
  private resolver?: (value: boolean | PromiseLike<boolean>) => void;

  show(text: string): Promise<boolean> {
    this.contentEl.empty();
    this.contentEl.createEl('p', { text, cls: 'secret-notes-modal__message' });

    const footer = this.contentEl.createDiv({ cls: 'secret-notes-modal__actions' });

    return new Promise((resolve) => {
      this.resolver = resolve;
      footer.createEl('button', { text: t('取消') }).addEventListener('click', () => {
        resolve(false);
        this.resolver = undefined;
        this.close();
      });
      footer.createEl('button', { text: t('确认'), cls: 'mod-cta' }).addEventListener('click', () => {
        resolve(true);
        this.resolver = undefined;
        this.close();
      });
    });
  }

  onClose(): void {
    if (this.resolver) {
      this.resolver(false);
      this.resolver = undefined;
    }
  }
}
