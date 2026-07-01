import {
  MarkdownView,
  Notice,
  Plugin,
  type MarkdownPostProcessorContext,
  type MarkdownSectionInformation,
  type TFile,
} from 'obsidian';
import { isEncrypted } from './crypto.js';
import { SECRET_LANG } from './consts.js';
import { CryptorModal } from './components/cryptor.js';
import { renderEncryptedBlock, renderPlainBlock, serializeSecretFence } from './components/secret-blocks.js';

export default class SecretNotesPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerMarkdownCodeBlockProcessor(SECRET_LANG, (source, el, ctx) => {
      const payload = isEncrypted(source);

      if (payload) {
        renderEncryptedBlock(el, payload, {
          onView: async () => {
            const result = await new CryptorModal(this.app).openEdit(payload);
            if (!result) {
              return;
            }

            await this.replaceSecretBlock(ctx, el, serializeSecretFence(result));
          },
          onChangePassword: async () => {
            const result = await new CryptorModal(this.app).openChangePassword(payload);
            if (!result) {
              return;
            }

            await this.replaceSecretBlock(ctx, el, serializeSecretFence(result));
          },
        });
      } else {
        renderPlainBlock(el, async () => {
          const result = await new CryptorModal(this.app).openEncrypt(source);
          if (!result) {
            return;
          }

          await this.replaceSecretBlock(ctx, el, serializeSecretFence(result));
        });
      }
    });
  }

  private async replaceSecretBlock(
    ctx: MarkdownPostProcessorContext,
    el: HTMLElement,
    replacement: string,
  ): Promise<void> {
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) {
      new Notice('无法定位当前 secret 代码块');
      return;
    }

    const file = this.app.vault.getFileByPath(ctx.sourcePath);
    if (!file) {
      new Notice('无法找到当前文件');
      return;
    }

    // ! Only source/preview mode can we directly modify the editor; in preview mode, editor modifications won't
    // ! be reflected in the editor.
    // ! Must use vault.modify to actually write into disk
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView?.file?.path === file.path && activeView.getMode() === 'source') {
      this.replaceBlockInEditor(activeView, sectionInfo, replacement);
    } else {
      await this.replaceBlockInFile(file, sectionInfo, replacement);
    }
  }

  private replaceBlockInEditor(view: MarkdownView, sectionInfo: MarkdownSectionInformation, replacement: string): void {
    view.editor.replaceRange(
      replacement,
      { line: sectionInfo.lineStart, ch: 0 },
      { line: sectionInfo.lineEnd + 1, ch: 0 },
    );
  }

  private async replaceBlockInFile(
    file: TFile,
    sectionInfo: MarkdownSectionInformation,
    replacement: string,
  ): Promise<void> {
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split('\n');
    const replacementLines = replacement.endsWith('\n')
      ? replacement.slice(0, -1).split('\n')
      : replacement.split('\n');
    lines.splice(sectionInfo.lineStart, sectionInfo.lineEnd - sectionInfo.lineStart + 1, ...replacementLines);
    await this.app.vault.modify(file, lines.join('\n'));
  }
}
