import type {
  FormEncrypt,
  FormPasswordInput,
  ImageEncryptInput,
  NormalizedSecretImagePayload,
} from '../types.js';

import { Notice } from 'obsidian';
import { t } from '../i18n/index.js';
import { SecretModal } from './modal.js';

export class ImageCryptorModal extends SecretModal {
  /** Collect password/title/hint for a new image; no encryption happens here. */
  openImageEncrypt(): Promise<ImageEncryptInput | null> {
    this.prepare();
    this.titleEl.setText(t('加密图片'));

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
      async (data) => {
        if (!this.checkPasswordForm(data)) {
          return;
        }

        this.handoffInProgress = true; // prevents onClose calling finish(null)
        this.finish<ImageEncryptInput>({
          password: data.password,
          title: data.title,
          hint: data.hint,
        });
        this.close();
      },
    );

    this.open();
    return this.wait<ImageEncryptInput>();
  }

  /**
   * Ask for the password and verify it. `verify` reports its own failure
   * Notices (missing file / corrupted / wrong password) and throws to keep
   * the form open.
   */
  openImageUnlock(
    payload: NormalizedSecretImagePayload,
    verify: (password: string) => Promise<ArrayBuffer>,
  ): Promise<ArrayBuffer | null> {
    this.prepare();
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
      async (data) => {
        if (!data.password) {
          new Notice(t('请输入密码'));
          return;
        }

        try {
          const buffer = await verify(data.password);
          this.handoffInProgress = true;
          this.finish(buffer);
          this.close();
        } catch (e) {
          console.error(e);
        }
      },
    );

    this.open();
    return this.wait<ArrayBuffer>();
  }
}
