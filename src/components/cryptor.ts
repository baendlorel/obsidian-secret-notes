import { type App, Notice } from 'obsidian';
import { decryptSecret } from '../crypto.js';
import type { FormChangePassword, FormEdit, FormEncrypt, FormPasswordInput, SecretPayload } from '../types.js';
import { SecretModal } from './modal.js';

export class CryptorModal extends SecretModal {
  constructor(app: App) {
    super(app);
  }

  private showPasswordForm(payload: SecretPayload): void {
    this.titleEl.setText('输入密码');
    this.createForm<FormPasswordInput>(
      [
        {
          name: 'password',
          label: '密码',
          type: 'password',
          required: true,
          focus: true,
          placeholder: payload.hint,
        },
      ],
      (data) => this.submitEdit(payload, data),
    );
  }

  private showEditForm(payload: SecretPayload, plaintext: string, password: string): void {
    this.modalEl.addClass('secret-notes-modal--decrypted');
    this.titleEl.setText('编辑明文');
    this.createForm<FormEdit>(
      [
        {
          name: 'title',
          label: '标题',
          value: payload.title,
        },
        {
          name: 'hint',
          label: '密码提示',
          value: payload.hint,
        },
        {
          name: 'plaintext',
          label: '明文内容',
          value: plaintext,
          type: 'textarea',
        },
      ],
      (data) =>
        this.encrypt(data.plaintext, {
          title: data.title,
          hint: data.hint,
          password: password,
          passwordConfirm: password,
        }),
    );
  }

  openEncrypt(plaintext = ''): Promise<SecretPayload | null> {
    this.prepare();
    this.titleEl.setText('加密');

    this.createForm<FormEncrypt>(
      [
        {
          name: 'password',
          label: '密码',
          type: 'password',
          required: true,
          focus: true,
        },
        {
          name: 'passwordConfirm',
          label: '确认密码',
          type: 'password',
          required: true,
        },
        { name: 'title', label: '标题' },
        { name: 'hint', label: '密码提示' },
      ],
      (data) => this.encrypt(plaintext, data),
    );

    this.open();
    return this.waitForResult();
  }

  openEdit(payload: SecretPayload): Promise<SecretPayload | null> {
    this.prepare();
    this.showPasswordForm(payload);

    this.open();
    return this.waitForResult();
  }

  private async submitEdit(payload: SecretPayload, data: FormPasswordInput): Promise<void> {
    const { password } = data;

    if (!password) {
      new Notice('请输入密码');
      return;
    }

    try {
      const plaintext = await decryptSecret(payload, password);
      // Set the flag to prevent finish(null)
      this.handoffInProgress = true;
      this.close();
      // Show edit form immediately
      this.showEditForm(payload, plaintext, password);
      this.open();
    } catch (e) {
      console.error(e);
      new Notice('密码错误，解密失败');
      this.showPasswordForm(payload);
    }
  }

  openChangePassword(payload: SecretPayload): Promise<SecretPayload | null> {
    this.prepare();
    this.titleEl.setText('验证旧密码');

    this.createForm<FormChangePassword>(
      [
        {
          name: 'currentPassword',
          label: '当前密码',
          type: 'password',
          required: true,
          focus: true,
          placeholder: payload.hint,
        },
        {
          name: 'newPassword',
          label: '新密码',
          type: 'password',
          required: true,
        },
        {
          name: 'newPasswordConfirm',
          label: '确认密码',
          type: 'password',
          required: true,
        },
        { name: 'title', label: '标题', value: payload.title },
        { name: 'hint', label: '提示', value: payload.hint },
      ],
      (data) => this.submitChangePassword(payload, data),
    );

    this.open();
    return this.waitForResult();
  }

  private async submitChangePassword(payload: SecretPayload, data: FormChangePassword): Promise<void> {
    const { currentPassword, newPassword, newPasswordConfirm, title, hint } = data;

    if (!currentPassword) {
      new Notice('请输入当前密码');
      return;
    }

    if (!newPassword) {
      new Notice('请输入新密码');
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      new Notice('两次输入的密码不一致');
      return;
    }

    try {
      const plaintext = await decryptSecret(payload, currentPassword);
      await this.encrypt(plaintext, {
        password: newPassword,
        passwordConfirm: newPasswordConfirm,
        title,
        hint,
      }); // this will close the modal
    } catch (error) {
      console.error(error);
      new Notice('当前密码错误');
    }
  }
}
