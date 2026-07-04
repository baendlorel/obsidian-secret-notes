import type { FormEdit, FormEncrypt, FormPasswordInput, NormalizedSecretPayload } from '../types.js';

import { Notice } from 'obsidian';
import { t } from '../i18n/index.js';
import { decryptSecret } from '../crypto.js';
import { SecretModal } from './modal.js';
import { secondClickConfirm } from '../utils.js';

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
    this.titleEl.setText(t('编辑'));
    this.contentEl.empty();

    const form = this.contentEl.createEl('form', { cls: 'secret-notes__encrypt-form' });

    // Row 1: title + hint side-by-side
    const row = form.createDiv({ cls: 'secret-notes__form-row' });

    // title field
    const titleControl = row.createDiv({ cls: 'secret-notes__form-control' });
    const titleLabel = titleControl.createDiv({ cls: 'secret-notes__field-label' });
    titleLabel.createSpan({ text: t('标题') });
    const titleInput = titleControl.createEl('input', { cls: 'secret-notes-modal__input' });
    titleInput.type = 'text';
    titleInput.name = 'title';
    titleInput.value = payload.title;

    // hint field
    const hintControl = row.createDiv({ cls: 'secret-notes__form-control' });
    const hintLabel = hintControl.createDiv({ cls: 'secret-notes__field-label' });
    hintLabel.createSpan({ text: t('密码提示') });
    const hintInput = hintControl.createEl('input', { cls: 'secret-notes-modal__input' });
    hintInput.type = 'text';
    hintInput.name = 'hint';
    hintInput.value = payload.hint;

    // Row 2: plaintext textarea (no label)
    const textarea = form.createEl('textarea', { cls: 'secret-notes-modal__textarea' });
    textarea.name = 'plaintext';
    textarea.value = plaintext;

    const footer = this.contentEl.createDiv({ cls: 'secret-notes-modal__actions' });

    const decryptBtn = footer.createEl('button', { cls: 'mod-warning', type: 'button', text: t('永久解密') });
    secondClickConfirm(decryptBtn, t('确认要永久解密吗？'), () => {
      this.handoffInProgress = true;
      this.finish(textarea.value.trim());
      this.close();
    });

    const confirmBtn = footer.createEl('button', { text: t('确认'), cls: 'mod-cta', type: 'button' });
    confirmBtn.addEventListener('click', () => {
      decryptBtn.disabled = true;
      confirmBtn.disabled = true;

      const fd = new FormData(form);
      const editData: FormEdit = {
        title: String(fd.get('title') ?? '').trim(),
        hint: String(fd.get('hint') ?? '').trim(),
        plaintext: String(fd.get('plaintext') ?? '').trim(),
      };

      void this.encrypt(editData.plaintext, {
        title: editData.title,
        hint: editData.hint,
        password,
        passwordConfirm: password,
      })
        .catch(console.error)
        .finally(() => {
          decryptBtn.disabled = false;
          confirmBtn.disabled = false;
        });
    });
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

  openEdit(payload: NormalizedSecretPayload): Promise<NormalizedSecretPayload | string | null> {
    this.prepare();
    this.showPasswordForm(payload);

    this.open();
    return this.wait<NormalizedSecretPayload | string>();
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
}
