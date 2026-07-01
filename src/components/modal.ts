import { type App, Modal } from 'obsidian';
import { type SecretPayload } from '../types.js';
import { InputElementOptions } from '../types.js';

export abstract class SecretModal extends Modal {
  protected resolver?: (value: SecretPayload | null) => void;
  protected settled: boolean = false;
  protected handoffInProgress: boolean = false;

  constructor(app: App) {
    super(app);
  }

  protected waitForResult(): Promise<SecretPayload | null> {
    return new Promise<SecretPayload | null>((resolve) => (this.resolver = resolve));
  }

  protected prepare(): void {
    this.settled = false;
    this.handoffInProgress = false;
    this.resolver = undefined;
  }

  protected finish(result: SecretPayload | null): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolver?.(result);
    this.resolver = undefined;
  }

  override onClose(): void {
    this.titleEl.empty();
    this.contentEl.empty();

    if (!this.settled && !this.handoffInProgress) {
      this.finish(null);
    }

    this.handoffInProgress = false;
  }

  protected createForm(inputs: InputElementOptions[], onYes: (data: unknown) => Promise<void>) {
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
    const yesBtn = footer.createEl('button', { text: '确认', cls: 'mod-cta secret-notes-button', type: 'button' });
    yesBtn.addEventListener('click', () => {
      noBtn.disabled = true;
      yesBtn.disabled = true;

      const data: Record<string, string> = {};
      new FormData(form).forEach((value, key) => (data[key] = String(value ?? '').trim()));

      onYes(data as unknown).finally(() => {
        noBtn.disabled = false;
        yesBtn.disabled = false;
      });
    });

    return form;
  }
}
