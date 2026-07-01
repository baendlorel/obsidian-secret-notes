import { type App, Modal, Notice } from 'obsidian';
import { encryptSecret } from '../crypto.js';
import type { SecretEditorResult, SecretPayload } from '../types.js';

export class EditModal extends Modal {
  private resolver?: (result: SecretPayload | null) => void;
  private settled = false;

  private readonly titleInputValue: string;
  private readonly hintInputValue: string;
  private readonly plainTextValue: string;

  private titleInput?: HTMLInputElement;
  private hintInput?: HTMLInputElement;
  private plainTextInput?: HTMLTextAreaElement;

  constructor(
    app: App,
    private readonly payload: SecretPayload,
    private readonly password: string,
    plaintext: string,
  ) {
    super(app);
    this.titleInputValue = payload.title ?? '';
    this.hintInputValue = payload.hint ?? '';
    this.plainTextValue = plaintext;
  }

  openEditor(): Promise<SecretPayload | null> {
    this.modalEl.addClass('secret-notes-modal--decrypted');
    this.titleEl.setText('编辑明文');
    this.contentEl.empty();

    const form = this.contentEl.createDiv({ cls: 'secret-notes__encrypt-form' });
    this.titleInput = this.createInputField(form, '标题', this.titleInputValue);
    this.hintInput = this.createInputField(form, '密码提示', this.hintInputValue);

    this.createFieldLabel(form, '明文内容', true);
    this.plainTextInput = form.createEl('textarea', { cls: 'secret-notes-modal__textarea' });
    this.plainTextInput.value = this.plainTextValue;

    this.contentEl.createDiv({
      cls: 'secret-notes-modal__hint',
      text: `关闭这个窗口时会自动重新加密。上次加密时间：${this.payload.date}`,
    });

    const actions = this.contentEl.createDiv({ cls: 'secret-notes-card__actions' });
    actions.createEl('button', { text: '取消' }, (v) => v.addEventListener('click', () => this.close()));
    actions.createEl('button', { cls: 'mod-cta secret-notes-button', text: '保存' }, (v) => {
      v.addEventListener('click', () => this.handleExplicitEncrypt(v));
    });

    this.open();
    this.plainTextInput.focus();

    return new Promise((r) => (this.resolver = r));
  }

  override onClose(): void {
    this.modalEl.removeClass('secret-notes-modal--decrypted');
    this.titleEl.empty();
    this.contentEl.empty();

    if (this.settled) {
      return;
    }

    void this.encryptCurrentState()
      .then((result) => {
        this.finish(result);
      })
      .catch((error) => {
        console.error(error);
        new Notice('重新加密失败');
        this.finish(null);
      });
  }

  private createInputField(parent: HTMLElement, label: string, value = '', required = false): HTMLInputElement {
    this.createFieldLabel(parent, label, required);
    return parent.createEl('input', undefined, (v) => {
      v.type = 'text';
      v.value = value;
    });
  }

  private createFieldLabel(parent: HTMLElement, label: string, required = false): HTMLDivElement {
    return parent.createDiv({ cls: 'secret-notes__field-label' }, (v) => {
      v.createSpan({ text: label });
      if (required) {
        v.createSpan({ cls: 'secret-notes__required-mark', text: '*' });
      }
    });
  }

  private collectEditorResult(): SecretEditorResult {
    return {
      plaintext: this.plainTextInput?.value ?? '',
      title: this.titleInput?.value.trim() ?? '',
      hint: this.hintInput?.value.trim() ?? '',
    };
  }

  private async encryptCurrentState(): Promise<SecretPayload> {
    const editorResult = this.collectEditorResult();
    return encryptSecret(editorResult.plaintext, this.password, {
      title: editorResult.title,
      hint: editorResult.hint,
    });
  }

  private async handleExplicitEncrypt(confirmButton: HTMLButtonElement): Promise<void> {
    confirmButton.disabled = true;

    try {
      const result = await this.encryptCurrentState();
      this.finish(result);
      this.close();
    } catch (error) {
      console.error(error);
      new Notice('重新加密失败');
      confirmButton.disabled = false;
    }
  }

  private finish(result: SecretPayload | null): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolver?.(result);
    this.resolver = undefined;
  }
}
