import { type App, Modal, Notice } from 'obsidian';
import type { FormEncrypt, InputElementOptions } from '../types.js';
import { encryptSecret } from '../crypto.js';

export abstract class SecretModal extends Modal {
  protected resolver?: (value: unknown) => void;
  protected settled: boolean = false;
  protected handoffInProgress: boolean = false;

  constructor(app: App) {
    super(app);
  }

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

    // # input elements
    for (let i = 0; i < inputs.length; i++) {
      const o = inputs[i];
      const labelEl = form.createDiv({ cls: 'secret-notes__field-label' });
      labelEl.createSpan({ text: o.label });
      if (o.required) {
        labelEl.createSpan({ cls: 'secret-notes__required-mark', text: '*' });
      }

      let field: HTMLTextAreaElement | HTMLInputElement;
      if (o.type === 'textarea') {
        field = form.createEl('textarea');
        field.className = 'secret-notes-modal__textarea';
      } else {
        field = form.createEl('input');
        field.className = 'secret-notes-modal__input';
        field.type = o.type ?? 'text';
      }
      field.name = o.name;
      field.value = o.value ?? '';

      if (o.placeholder) {
        field.placeholder = o.placeholder;
      }
      if (o.focus) {
        setTimeout(() => field.focus(), 100);
      }
    }

    // # footer
    const footer = this.contentEl.createDiv({ cls: 'secret-notes-card__actions' });

    const noBtn = footer.createEl('button', { text: '取消', type: 'button' });
    noBtn.addEventListener('click', () => this.close());

    const yesBtn = footer.createEl('button', { text: '确认', cls: 'mod-cta', type: 'button' });
    yesBtn.addEventListener('click', () => {
      noBtn.disabled = true;
      yesBtn.disabled = true;

      const data: Record<string, string> = {};
      new FormData(form).forEach((value, key) => (data[key] = String(value ?? '').trim()));
      onYes(data as T).finally(() => {
        noBtn.disabled = false;
        yesBtn.disabled = false;
      });
    });

    return form;
  }

  protected async encrypt(plaintext: string, data: FormEncrypt): Promise<void> {
    const { title, hint, password, passwordConfirm } = data;

    if (!password) {
      new Notice('请输入密码');
      return;
    }

    if (password !== passwordConfirm) {
      new Notice('两次输入的密码不一致');
      return;
    }

    try {
      const encrypted = await encryptSecret({ plaintext, password, title, hint });
      this.handoffInProgress = true; // prevents onClose calling finish(null)
      this.finish(encrypted);
      this.close();
    } catch (error) {
      console.error(error);
      new Notice('加密失败，请稍后重试');
    }
  }
}
