import {
  MarkdownView,
  Notice,
  Plugin,
  type MarkdownPostProcessorContext,
  type MarkdownSectionInformation,
  type TFile,
} from 'obsidian';
import { parseSecretPayload } from './crypto.js';
import { DEFAULT_SETTINGS } from './consts.js';
import { CryptorModal } from './components/cryptor.js';
import { renderEncryptedBlock, renderPlainBlock, serializeSecretFence } from './components/secret-blocks.js';
import { SecretNotesSettingTab } from './settings.js';
import { t } from './i18n/index.js';
import type { SecretNotesSettings } from './types.js';

export default class SecretNotesPlugin extends Plugin {
  settings: SecretNotesSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new SecretNotesSettingTab(this));
    this.registerProcessor();
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...data };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /**
   * Register a code block processor for the current block name.
   * Each call registers a NEW processor; old processors remain active but only
   * handle their specific language. When block name changes, old blocks in the
   * vault will no longer be processed (they become plain code blocks).
   */
  registerProcessor(): void {
    this.registerMarkdownCodeBlockProcessor(this.settings.blockName, (source, el, ctx) => {
      this.processSecretBlock(source, el, ctx);
    });
  }

  /** Re-register processor for the new block name and re-render all previews. */
  async applySettings(): Promise<void> {
    await this.saveSettings();
    this.registerProcessor();

    // Trigger re-render of all open markdown preview views
    this.app.workspace.iterateAllLeaves((leaf) => {
      const { view } = leaf;
      if (view instanceof MarkdownView) {
        view.previewMode?.rerender(true);
      }
    });
  }

  private processSecretBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
  ): void {
    const payload = parseSecretPayload(source);

    if (payload) {
      renderEncryptedBlock(el, payload, {
        onView: async () => {
          const result = await new CryptorModal(this.app).openEdit(payload);
          if (!result) {
            return;
          }

          await this.replaceSecretBlock(ctx, el, serializeSecretFence(result, this.settings.blockName));
        },
      });
    } else {
      renderPlainBlock(el, source, {
        onEncrypt: async () => {
          const result = await new CryptorModal(this.app).openEncrypt(source);
          if (!result) {
            return;
          }

          await this.replaceSecretBlock(ctx, el, serializeSecretFence(result, this.settings.blockName));
        },
      });
    }

    el.createDiv({
      cls: 'kasukabe-watermark__secret-notes',
      text: `v__VERSION__`, //  © __YEAR__ Kasukabe Tsumugi. All Rights Reserved.
    });
  }

  private async replaceSecretBlock(
    ctx: MarkdownPostProcessorContext,
    el: HTMLElement,
    replacement: string,
  ): Promise<void> {
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) {
      new Notice(t('无法定位当前 secret 代码块'));
      return;
    }

    const file = this.app.vault.getFileByPath(ctx.sourcePath);
    if (!file) {
      new Notice(t('无法找到当前文件'));
      return;
    }

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
