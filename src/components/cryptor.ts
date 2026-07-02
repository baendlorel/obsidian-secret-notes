import type {
  FormChangePassword,
  FormEdit,
  FormEncrypt,
  FormPasswordInput,
  NormalizedSecretPayload,
} from '../types.js';

import { Notice } from 'obsidian';
import { t } from '../i18n/index.js';
import { decryptSecret } from '../crypto.js';
import { SecretModal } from './modal.js';

export class CryptorModal extends SecretModal {
  private showPasswordForm(payload: NormalizedSecretPayload): void {
    this.titleEl.setText(t('输入密码'));
    this.createForm<FormPasswordInput>(
      [
        {
          name: 'password',
          label: t('密码'),
          type: 'password',
          required: true,
          focus: true,
          placeholder: payload.hint,
        },
      ],
      (data) => this.submitEdit(payload, data),
    );
  }

  private showEditForm(payload: NormalizedSecretPayload, plaintext: string, password: string): void {
    this.modalEl.addClass('secret-notes-modal--decrypted');
    this.titleEl.setText(t('编辑明文'));
    this.createForm<FormEdit>(
      [
        {
          name: 'title',
          label: t('标题'),
          value: payload.title,
        },
        {
          name: 'hint',
          label: t('密码提示'),
          value: payload.hint,
        },
        {
          name: 'plaintext',
          label: t('明文内容'),
          value: plaintext,
          type: 'textarea',
        },
      ],
      (data) =>
        this.encrypt(data.plaintext, {
          title: data.title,
          hint: data.hint,
          password,
          passwordConfirm: password,
        }),
    );
  }

  openEncrypt(plaintext = ''): Promise<NormalizedSecretPayload | null> {
    this.prepare();
    this.titleEl.setText(t('加密'));

    this.createForm<FormEncrypt>(
      [
        {
          name: 'password',
          label: t('密码'),
          type: 'password',
          required: true,
          focus: true,
        },
        {
          name: 'passwordConfirm',
          label: t('确认密码'),
          type: 'password',
          required: true,
        },
        { name: 'title', label: t('标题') },
        { name: 'hint', label: t('密码提示') },
      ],
      (data) => this.encrypt(plaintext, data),
    );

    this.open();
    return this.wait<NormalizedSecretPayload>();
  }

  openEdit(payload: NormalizedSecretPayload): Promise<NormalizedSecretPayload | null> {
    this.prepare();
    this.showPasswordForm(payload);

    this.open();
    return this.wait<NormalizedSecretPayload>();
  }

  openDecrypt(payload: NormalizedSecretPayload): Promise<string | null> {
    this.prepare();
    this.showDecryptForm(payload);

    this.open();
    return this.wait<string>();
  }

  private showDecryptForm(payload: NormalizedSecretPayload): void {
    this.titleEl.setText(t('永久解密'));
    this.createForm<FormPasswordInput>(
      [
        {
          name: 'password',
          label: t('密码'),
          type: 'password',
          required: true,
          focus: true,
          placeholder: payload.hint,
        },
      ],
      (data) => this.submitDecrypt(payload, data),
    );
  }

  private async submitDecrypt(payload: NormalizedSecretPayload, data: FormPasswordInput): Promise<void> {
    const { password } = data;

    if (!password) {
      new Notice(t('请输入密码'));
      return;
    }

    try {
      const plaintext = await decryptSecret(payload, password);
      this.handoffInProgress = true; // prevents onClose calling finish(null)
      this.finish<string>(plaintext);
      this.close();
    } catch (e) {
      console.error(e);
      new Notice(t('密码错误，解密失败'));
      this.showDecryptForm(payload);
    }
  }

  private async submitEdit(payload: NormalizedSecretPayload, data: FormPasswordInput): Promise<void> {
    const { password } = data;

    if (!password) {
      new Notice(t('请输入密码'));
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
      new Notice(t('密码错误，解密失败'));
      this.showPasswordForm(payload);
    }
  }

  openChangePassword(payload: NormalizedSecretPayload): Promise<NormalizedSecretPayload | null> {
    this.prepare();
    this.titleEl.setText(t('验证旧密码'));

    this.createForm<FormChangePassword>(
      [
        {
          name: 'currentPassword',
          label: t('当前密码'),
          type: 'password',
          required: true,
          focus: true,
          placeholder: payload.hint,
        },
        {
          name: 'newPassword',
          label: t('新密码'),
          type: 'password',
          required: true,
        },
        {
          name: 'newPasswordConfirm',
          label: t('确认密码'),
          type: 'password',
          required: true,
        },
        { name: 'title', label: t('标题'), value: payload.title },
        { name: 'hint', label: t('提示'), value: payload.hint },
      ],
      (data) => this.submitChangePassword(payload, data),
    );

    this.open();
    return this.wait<NormalizedSecretPayload>();
  }

  private async submitChangePassword(payload: NormalizedSecretPayload, data: FormChangePassword): Promise<void> {
    const { currentPassword, newPassword, newPasswordConfirm, title, hint } = data;

    if (!currentPassword) {
      new Notice(t('请输入当前密码'));
      return;
    }

    if (!newPassword) {
      new Notice(t('请输入新密码'));
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      new Notice(t('两次输入的密码不一致'));
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
      new Notice(t('当前密码错误'));
    }
  }
}
