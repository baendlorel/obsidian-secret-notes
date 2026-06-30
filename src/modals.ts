import { type App, Modal, Notice, Setting } from 'obsidian';
import type { SecretEditorResult, SecretFormResult, SecretPayload } from './types.js';
import { btn, div, input } from 'zed-gpui';

export class CryptorModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  openEncrypt() {
    this.titleEl.setText('加密');
    this.contentEl.empty();

    const form = div()
      .class_('secret-notes__encrypt-form')
      .child_(div().text_('密码'), input(), div().text_('确认密码'), input());
    this.contentEl.append(
      div().child_(
        form,
        btn()
          .text_('确认')
          .onClick_(() => {
            // TODO 加密逻辑
          }),
      ),
    );
    this.open();
  }

  openPasswordInput(o: SecretPayload) {
    this.titleEl.setText('输入密码');
    this.contentEl.empty();

    const form = div().class_('secret-notes__encrypt-form').child_(div().text_('密码'), input());

    if (o.hint) {
      form.child_(
        div()
          .class_('secret-notes-modal__hint')
          .text_(o.hint || ''),
      );
    }

    this.contentEl.append(
      div().child_(
        form,
        btn()
          .text_('确认')
          .onClick_(() => {
            this.openDecrypted(o);
          }),
      ),
    );
    this.open();
  }

  openDecrypted(o: SecretPayload) {
    // TODO 展示一个可编辑的、显示明文的modal、当关闭的时候，会自动加密回去
  }
}

export class DecryptedModal extends Modal {}
