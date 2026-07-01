import { type App, Modal, Notice } from 'obsidian';
import { decryptSecret, encryptSecret } from '../crypto.js';
import type { InputElementOptions, SecretEditorResult, SecretFormResult, SecretPayload } from '../types.js';

function createFooter(modal: Modal, form: HTMLFormElement, onYes: (el: HTMLButtonElement) => void) {
  const e = form.createDiv({ cls: 'secret-notes-card__actions' });
  e.createEl('button', { text: '取消' }, (v) => v.addEventListener('click', () => modal.close()));
  e.createEl('button', { text: '确认', cls: 'mod-cta secret-notes-button' }, (v) =>
    v.addEventListener('click', () => onYes(v)),
  );
  return e;
}

export class CryptorModal extends Modal {
  private resolver?: (result: SecretPayload | null) => void;
  private settled = false;
  private handoffInProgress = false;

  constructor(app: App) {
    super(app);
  }

  openEncrypt(
    plaintext = '',
    defaults: Partial<Pick<SecretPayload, 'title' | 'hint'>> = {},
  ): Promise<SecretPayload | null> {
    this.preparePromise();
    this.titleEl.setText('加密');
    this.contentEl.empty();

    const form = this.contentEl.createEl('form', { cls: 'secret-notes__encrypt-form' });
    const passwordInput = this.input({
      form,
      name: 'password',
      label: '密码',
      type: 'password',
      value: '',
      required: true,
    });
    const titleInput = this.input({ form, name: 'title', label: '标题', type: 'text', value: defaults.title });
    const hintInput = this.input({ form, name: 'hint', label: '密码提示', type: 'text', value: defaults.hint });
    const confirmInput = this.input({
      form,
      name: 'confirm',
      label: '确认密码',
      type: 'password',
      value: '',
      required: true,
    });

    createFooter(this, form, (confirmButton) =>
      this.handleEncryptSubmit({
        plaintext,
        titleInput,
        hintInput,
        passwordInput,
        confirmInput,
        confirmButton,
      }),
    );

    this.open();
    passwordInput.focus();
    return this.waitForResult();
  }

  openPasswordInput(payload: SecretPayload): Promise<SecretPayload | null> {
    this.preparePromise();
    this.titleEl.setText('输入密码');
    this.contentEl.empty();

    const form = this.contentEl.createEl('form', { cls: 'secret-notes__encrypt-form' });
    const passwordInput = this.input({
      form,
      name: 'password',
      label: '密码',
      type: 'password',
      required: true,
    });
    const errorEl = this.contentEl.createDiv({ cls: 'secret-notes-card__warning' });
    const hintEl = this.contentEl.createDiv({ cls: 'secret-notes-modal__hint' });
    hintEl.hide();

    createFooter(this, form, (confirmButton) => {
      void this.handleDecryptSubmit({
        payload,
        passwordInput,
        errorEl,
        hintEl,
        confirmButton,
      });
    });

    this.open();
    passwordInput.focus();
    return this.waitForResult();
  }

  openChangePassword(payload: SecretPayload): Promise<SecretPayload | null> {
    this.preparePromise();
    this.titleEl.setText('验证旧密码');
    this.contentEl.empty();

    // TODO 难道不能用new FormData form元素吗？一定要逐个处理吗
    const form = this.contentEl.createEl('form', { cls: 'secret-notes__encrypt-form' });
    const passwordInput = this.input({ form, name: 'password', label: '当前密码', type: 'password', required: true });
    const errorEl = this.contentEl.createDiv({ cls: 'secret-notes-card__warning' });

    const actions = form.createDiv({ cls: 'secret-notes-card__actions' });
    const cancelButton = actions.createEl('button', { text: '取消' });
    const confirmButton = actions.createEl('button', { cls: 'mod-cta secret-notes-button', text: '下一步' });

    confirmButton.addEventListener('click', () => {
      void this.handleChangePasswordSubmit({
        payload,
        passwordInput,
        errorEl,
        confirmButton,
      });
    });

    cancelButton.addEventListener('click', () => {
      this.close();
    });

    this.open();
    passwordInput.focus();
    return this.waitForResult();
  }

  private async openDecrypted(
    payload: SecretPayload,
    password: string,
    plaintext: string,
  ): Promise<SecretPayload | null> {
    return new DecryptedModal(this.app, payload, password, plaintext).openEditor();
  }

  override onClose(): void {
    this.titleEl.empty();
    this.contentEl.empty();

    if (!this.settled && !this.handoffInProgress) {
      this.finish(null);
    }

    this.handoffInProgress = false;
  }

  private preparePromise(): void {
    this.settled = false;
    this.handoffInProgress = false;
    this.resolver = undefined;
  }

  private waitForResult(): Promise<SecretPayload | null> {
    return new Promise((resolve) => {
      this.resolver = resolve;
    });
  }

  private finish(result: SecretPayload | null): void {
    if (this.settled) {
      return;
    }

    this.settled = true;
    this.resolver?.(result);
    this.resolver = undefined;
  }

  private input({ form, name, label, type, value = '', required = false }: InputElementOptions): HTMLInputElement {
    this.createFieldLabel(form, label, required);
    const field = form.createEl('input');
    field.type = type;
    field.name = name;
    field.value = value;
    return field;
  }

  private createFieldLabel(parent: HTMLElement, label: string, required = false): HTMLDivElement {
    const labelEl = parent.createDiv({ cls: 'secret-notes__field-label' });
    labelEl.createSpan({ text: label });

    if (required) {
      labelEl.createSpan({ cls: 'secret-notes__required-mark', text: '*' });
    }

    return labelEl;
  }

  private buildFormResult(password: string, title: string, hint: string): SecretFormResult {
    return {
      password,
      title: title.trim() || undefined,
      hint: hint.trim() || undefined,
    };
  }

  private async handleEncryptSubmit(args: {
    plaintext: string;
    titleInput: HTMLInputElement;
    hintInput: HTMLInputElement;
    passwordInput: HTMLInputElement;
    confirmInput: HTMLInputElement;
    confirmButton: HTMLButtonElement;
  }): Promise<void> {
    const { plaintext, titleInput, hintInput, passwordInput, confirmInput, confirmButton } = args;

    if (!passwordInput.value) {
      new Notice('请输入密码');
      passwordInput.focus();
      return;
    }

    if (passwordInput.value !== confirmInput.value) {
      new Notice('两次输入的密码不一致');
      confirmInput.focus();
      return;
    }

    const formResult = this.buildFormResult(passwordInput.value, titleInput.value, hintInput.value);
    confirmButton.disabled = true;

    try {
      const encrypted = await encryptSecret(plaintext, formResult.password, {
        title: formResult.title,
        hint: formResult.hint,
      });
      this.finish(encrypted);
      this.close();
    } catch (error) {
      console.error(error);
      new Notice('加密失败，请稍后重试');
      confirmButton.disabled = false;
    }
  }

  private async handleDecryptSubmit(args: {
    payload: SecretPayload;
    passwordInput: HTMLInputElement;
    errorEl: HTMLDivElement;
    hintEl: HTMLDivElement;
    confirmButton: HTMLButtonElement;
  }): Promise<void> {
    const { payload, passwordInput, errorEl, hintEl, confirmButton } = args;

    if (!passwordInput.value) {
      errorEl.setText('请输入密码');
      passwordInput.focus();
      return;
    }

    errorEl.empty();
    confirmButton.disabled = true;

    try {
      const plaintext = await decryptSecret(payload, passwordInput.value);
      this.handoffInProgress = true;
      this.close();
      const result = await this.openDecrypted(payload, passwordInput.value, plaintext);
      this.finish(result);
    } catch (error) {
      console.error(error);
      errorEl.setText('密码错误，解密失败');
      if (payload.hint) {
        hintEl.setText(`密码提示：${payload.hint}`);
        hintEl.show();
      }
      confirmButton.disabled = false;
      passwordInput.select();
    }
  }

  private async handleChangePasswordSubmit(args: {
    payload: SecretPayload;
    passwordInput: HTMLInputElement;
    errorEl: HTMLDivElement;
    confirmButton: HTMLButtonElement;
  }): Promise<void> {
    const { payload, passwordInput, errorEl, confirmButton } = args;

    if (!passwordInput.value) {
      errorEl.setText('请输入当前密码');
      passwordInput.focus();
      return;
    }

    errorEl.empty();
    confirmButton.disabled = true;

    try {
      const plaintext = await decryptSecret(payload, passwordInput.value);
      this.handoffInProgress = true;
      this.close();
      const result = await this.openEncrypt(plaintext, {
        title: payload.title,
        hint: payload.hint,
      });
      this.finish(result);
    } catch (error) {
      console.error(error);
      errorEl.setText('当前密码错误');
      confirmButton.disabled = false;
      passwordInput.select();
    }
  }
}

export class DecryptedModal extends Modal {
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
