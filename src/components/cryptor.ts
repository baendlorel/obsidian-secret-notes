import { type App, Notice } from 'obsidian';
import { decryptSecret, encryptSecret } from '../crypto.js';
import type { FormChangePassword, FormEncrypt, FormEdit, SecretPayload } from '../types.js';
import { SecretModal } from './modal.js';
import { EditModal } from './edit.js';

export class CryptorModal extends SecretModal {
  constructor(app: App) {
    super(app);
  }

  openEncrypt(plaintext = ''): Promise<SecretPayload | null> {
    this.prepare();
    this.titleEl.setText('加密');

    this.createForm(
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
      (data) => this.submitEncrypt(plaintext, data as FormEncrypt),
    );

    this.open();
    return this.waitForResult();
  }

  private async submitEncrypt(plaintext: string, data: FormEncrypt): Promise<void> {
    const { title, hint, password, passwordConfirm: confirm } = data;

    if (!password) {
      new Notice('请输入密码');
      return;
    }

    if (password !== confirm) {
      new Notice('两次输入的密码不一致');
      return;
    }

    try {
      const encrypted = await encryptSecret(plaintext, password, { title, hint });
      this.finish(encrypted);
      this.close();
    } catch (error) {
      console.error(error);
      new Notice('加密失败，请稍后重试');
    }
  }

  openEdit(payload: SecretPayload): Promise<SecretPayload | null> {
    this.prepare();
    this.titleEl.setText('输入密码');
    this.createForm(
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
      (data) => this.submitEdit(payload, data as FormEdit),
    );

    this.open();
    return this.waitForResult();
  }

  private async submitEdit(payload: SecretPayload, data: FormEdit): Promise<void> {
    const { password } = data;

    if (!password) {
      new Notice('请输入密码');
      return;
    }

    try {
      const plaintext = await decryptSecret(payload, password);
      this.handoffInProgress = true;
      this.close();
      const result = await new EditModal(this.app, payload, password, plaintext).openEditor();
      this.finish(result);
    } catch (e) {
      console.error(e);
      new Notice('密码错误，解密失败');
    }
  }

  openChangePassword(payload: SecretPayload): Promise<SecretPayload | null> {
    this.prepare();
    this.titleEl.setText('验证旧密码');

    this.createForm(
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
      (data) => this.submitChangePassword(payload, data as FormChangePassword),
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
      this.handoffInProgress = true;
      await this.submitEncrypt(plaintext, {
        password: newPassword,
        passwordConfirm: newPasswordConfirm,
        title,
        hint,
      });
      this.close();
    } catch (error) {
      console.error(error);
      new Notice('当前密码错误');
    }
  }
}
