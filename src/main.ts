import { Plugin } from 'obsidian';
import { SECRET_LANG } from './constants.js';
import { EncryptModal, SecretFormModal } from './modals.js';

export default class SecretNotesPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerMarkdownCodeBlockProcessor(SECRET_LANG, (source, el, ctx) => {
      const b = activeDocument.createElement('button');
      b.append('点击加密');
      b.addEventListener('click', () => {
        new EncryptModal(this.app).openEncrypt();
      });
      el.append(`source是：[${source}]`, b);
    });
  }
}
