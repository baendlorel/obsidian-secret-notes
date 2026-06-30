import { App, Modal, Notice, Setting } from 'obsidian';
import type { SecretEditorResult, SecretFormResult } from './types';

export class SecretFormModal extends Modal {
  private readonly mode: 'encrypt' | 'decrypt';
  private readonly hint: string;
  private readonly initialTitle: string;
  private readonly initialHint: string;
  private readonly initialPassword?: string;
  private resolveValue!: (value: SecretFormResult | null) => void;

  private password = '';
  private title = '';
  private hintValue = '';

  private constructor(
    app: App,
    options:
      | { mode: 'encrypt'; initialTitle: string; initialHint: string; password?: string }
      | { mode: 'decrypt'; hint: string; password?: string },
  ) {
    super(app);
    this.mode = options.mode;
    this.initialPassword = options.password;
    this.hint = options.mode === 'decrypt' ? options.hint : '';
    this.initialTitle = options.mode === 'encrypt' ? options.initialTitle : '';
    this.initialHint = options.mode === 'encrypt' ? options.initialHint : '';
    this.password = options.password ?? '';
    this.title = this.initialTitle;
    this.hintValue = this.initialHint;
  }

  static openForEncrypt(
    app: App,
    options: { initialTitle: string; initialHint: string; password?: string },
  ): Promise<SecretFormResult | null> {
    const modal = new SecretFormModal(app, { mode: 'encrypt', ...options });
    return modal.openAndWait();
  }

  static openForDecrypt(app: App, options: { hint: string; password?: string }): Promise<SecretFormResult | null> {
    const modal = new SecretFormModal(app, { mode: 'decrypt', ...options });
    return modal.openAndWait();
  }

  private openAndWait(): Promise<SecretFormResult | null> {
    return new Promise((resolve) => {
      this.resolveValue = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.setTitle(this.mode === 'encrypt' ? 'Encrypt secret block' : 'Decrypt secret block');
    this.contentEl.empty();

    if (this.mode === 'decrypt' && this.hint) {
      this.contentEl.createDiv({
        cls: 'secret-notes-modal__hint',
        text: `Hint: ${this.hint}`,
      });
    }

    new Setting(this.contentEl).setName('Password').addText((component) => {
      component
        .setPlaceholder('Enter password')
        .setValue(this.initialPassword ?? '')
        .onChange((value) => {
          this.password = value;
        });
      component.inputEl.type = 'password';
      window.setTimeout(() => component.inputEl.focus(), 0);
    });

    if (this.mode === 'encrypt') {
      new Setting(this.contentEl)
        .setName('Title')
        .setDesc('Optional label shown in preview.')
        .addText((component) => {
          component
            .setPlaceholder('Optional')
            .setValue(this.initialTitle)
            .onChange((value) => {
              this.title = value;
            });
        });

      new Setting(this.contentEl)
        .setName('Hint')
        .setDesc('Shown after the first failed decrypt attempt.')
        .addText((component) => {
          component
            .setPlaceholder('Optional')
            .setValue(this.initialHint)
            .onChange((value) => {
              this.hintValue = value;
            });
        });
    }

    new Setting(this.contentEl)
      .addButton((component) => {
        component
          .setButtonText(this.mode === 'encrypt' ? 'Encrypt' : 'Decrypt')
          .setCta()
          .onClick(() => {
            if (!this.password.trim()) {
              new Notice('Password is required.');
              return;
            }

            this.resolveValue({
              password: this.password,
              title: this.mode === 'encrypt' ? this.title.trim() : undefined,
              hint: this.mode === 'encrypt' ? this.hintValue.trim() : undefined,
            });
            this.close();
          });
      })
      .addButton((component) => {
        component.setButtonText('Cancel').onClick(() => {
          this.resolveValue(null);
          this.close();
        });
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class SecretEditorModal extends Modal {
  private readonly initialPlaintext: string;
  private readonly initialTitle: string;
  private readonly initialHint: string;
  private resolveValue!: (value: SecretEditorResult | null) => void;
  private plaintext: string;
  private title: string;
  private hint: string;

  private constructor(app: App, options: { plaintext: string; title: string; hint: string }) {
    super(app);
    this.initialPlaintext = options.plaintext;
    this.initialTitle = options.title;
    this.initialHint = options.hint;
    this.plaintext = options.plaintext;
    this.title = options.title;
    this.hint = options.hint;
  }

  static openForEdit(
    app: App,
    options: { plaintext: string; title: string; hint: string },
  ): Promise<SecretEditorResult | null> {
    const modal = new SecretEditorModal(app, options);
    return modal.openAndWait();
  }

  private openAndWait(): Promise<SecretEditorResult | null> {
    return new Promise((resolve) => {
      this.resolveValue = resolve;
      this.open();
    });
  }

  onOpen(): void {
    this.setTitle('Edit secret block');
    this.contentEl.empty();

    new Setting(this.contentEl)
      .setName('Title')
      .setDesc('Optional label shown in preview.')
      .addText((component) => {
        component
          .setPlaceholder('Optional')
          .setValue(this.initialTitle)
          .onChange((value) => {
            this.title = value;
          });
      });

    new Setting(this.contentEl)
      .setName('Hint')
      .setDesc('Shown after the first failed decrypt attempt.')
      .addText((component) => {
        component
          .setPlaceholder('Optional')
          .setValue(this.initialHint)
          .onChange((value) => {
            this.hint = value;
          });
      });

    new Setting(this.contentEl).setName('Content').addTextArea((component) => {
      component
        .setPlaceholder('Secret content')
        .setValue(this.initialPlaintext)
        .onChange((value) => {
          this.plaintext = value;
        });
      component.inputEl.rows = 12;
      component.inputEl.addClass('secret-notes-modal__textarea');
      window.setTimeout(() => component.inputEl.focus(), 0);
    });

    new Setting(this.contentEl)
      .addButton((component) => {
        component
          .setButtonText('Save and re-encrypt')
          .setCta()
          .onClick(() => {
            this.resolveValue({
              plaintext: this.plaintext,
              title: this.title.trim(),
              hint: this.hint.trim(),
            });
            this.close();
          });
      })
      .addButton((component) => {
        component.setButtonText('Cancel').onClick(() => {
          this.resolveValue(null);
          this.close();
        });
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
