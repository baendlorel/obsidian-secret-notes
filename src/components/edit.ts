import { type App } from 'obsidian';
import type { FormEdit, SecretPayload } from '../types.js';
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

    this.createForm<FormEdit>(
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
          value: this.plaintext,
          type: 'textarea',
        },
      ],
      (data) =>
        this.encrypt(data.plaintext, {
          title: data.title,
          hint: data.hint,
          password: this.password,
          passwordConfirm: this.password,
        }),
    );

    this.open();
    return this.waitForResult();
  }
}
