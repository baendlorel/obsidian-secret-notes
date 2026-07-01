import { type App, Notice } from 'obsidian';
import type { SecretEditorResult, SecretPayload } from '../types.js';
import { encryptSecret } from '../crypto.js';
import { SecretModal } from './modal.js';

export class EditModal extends SecretModal {
  private readonly payload: SecretPayload;
  private readonly password: string;
  private readonly plaintext: string;

  constructor(app: App, payload: SecretPayload, password: string, plaintext: string) {
    super(app);
    this.payload = { ...payload };
    this.password = password;
    this.plaintext = plaintext;
  }

  openEditor(): Promise<SecretPayload | null> {
    this.modalEl.addClass('secret-notes-modal--decrypted');
    this.titleEl.setText('编辑明文');
    this.contentEl.empty();

    this.createForm(
      [
        {
          name: 'title',
          label: '标题',
          value: this.payload.title,
        },
        {
          name: 'hint',
          label: '密码提示',
          value: this.payload.hint,
        },
        {
          name: 'plaintext',
          label: '明文内容',
          value: 'TODO 解密为明文',
          type: 'textarea',
        },
      ],
      (data) => {},
    );

    this.open();
    return this.waitForResult();
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
}
