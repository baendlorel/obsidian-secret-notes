import { Modal, Notice } from 'obsidian';
import type { FormEncrypt, InputElementOptions } from '../types.js';
import { encryptSecret } from '../crypto.js';
import { t } from '../i18n/index.js';

export abstract class SecretModal extends Modal {
  protected resolver?: (value: unknown) => void;
  protected settled: boolean = false;
  protected handoffInProgress: boolean = false;

  protected wait<T>(): Promise<T | null> {
    return new Promise<T | null>((resolve) => (this.resolver = resolve as (value: unknown) => void));
  }

  protected prepare(): void {
    this.settled = false;
    this.handoffInProgress = false;
    this.resolver = undefined;
  }

  protected finish<T>(result: T): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolver?.(result);
    this.resolver = undefined;
  }

  override onClose(): void {
    this.modalEl.removeClass('secret-notes-modal--decrypted');
    this.titleEl.empty();
    this.contentEl.empty();

    if (!this.settled && !this.handoffInProgress) {
      this.finish(null);
    }

    this.handoffInProgress = false;
  }

  protected createForm<T = unknown>(inputs: InputElementOptions[], onYes: (data: T) => Promise<void>) {
    this.contentEl.empty();
    const form = this.contentEl.createEl('form', { cls: 'secret-notes__encrypt-form' });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      yesHandler();
    });

    // # input elements
    for (let i = 0; i < inputs.length; i++) {
      const o = inputs[i];
      const control = form.createDiv({ cls: 'secret-notes__form-control' });
      const labelEl = control.createDiv({ cls: 'secret-notes__field-label' });
      labelEl.createSpan({ text: o.label });
      if (o.required) {
        labelEl.createSpan({ cls: 'secret-notes__required-mark', text: '*' });
      }

      const field = o.type === 'textarea' ? control.createEl('textarea') : control.createEl('input');
      if (field instanceof HTMLTextAreaElement) {
        field.className = 'secret-notes-modal__textarea';
      } else {
        field.className = 'secret-notes-modal__input';
        field.type = o.type ?? 'text';
      }
      field.name = o.name;
      field.value = o.value ?? '';

      if (o.placeholder) {
        field.placeholder = o.placeholder;
      }
      if (o.focus) {
        window.setTimeout(() => field.focus(), 100);
      }
    }

    // # footer
    const footer = this.contentEl.createDiv({ cls: 'secret-notes-modal__actions' });

    const noBtn = footer.createEl('button', { text: t('取消') });
    noBtn.setAttr('type', 'button');
    noBtn.addEventListener('click', () => this.close());

    const yesBtn = footer.createEl('button', { text: t('确认'), cls: 'mod-cta' });
    yesBtn.setAttr('type', 'button');
    const yesHandler = () => {
      noBtn.disabled = true;
      yesBtn.disabled = true;

      const data: Record<string, string> = {};
      new FormData(form).forEach((value, key) => (data[key] = String(value ?? '').trim()));

      void onYes(data as T)
        .catch(console.error)
        .finally(() => {
          noBtn.disabled = false;
          yesBtn.disabled = false;
        });
    };
    yesBtn.addEventListener('click', yesHandler);

    return form;
  }

  protected async encrypt(plaintext: string, data: FormEncrypt): Promise<void> {
    const { title, hint, password, passwordConfirm } = data;

    if (!password) {
      new Notice(t('请输入密码'));
      return;
    }

    if (password !== passwordConfirm) {
      new Notice(t('两次输入的密码不一致'));
      return;
    }

    try {
      const encrypted = await encryptSecret({ plaintext, password, title, hint });
      this.handoffInProgress = true; // prevents onClose calling finish(null)
      this.finish(encrypted);
      this.close();
    } catch (e) {
      console.error(e);
      new Notice(t('加密失败，请稍后重试'));
    }
  }
}
