import {
  MarkdownView,
  Notice,
  Plugin,
  type MarkdownPostProcessorContext,
  type MarkdownSectionInformation,
  type TFile,
} from 'obsidian';
import {
  decryptBytes,
  encryptBytes,
  parseEncryptedParts,
  parseSecretImagePayload,
  parseSecretPayload,
} from './crypto.js';
import { DEFAULT_SETTINGS, MAX_IMAGE_BYTES, SECRET_VERSION, SECRETIMAGE_LANG } from './consts.js';
import { CryptorModal } from './components/cryptor.js';
import { ImageCryptorModal } from './components/image-cryptor.js';
import { renderEncryptedBlock, renderPlainBlock, serializeSecretFence } from './components/secret-blocks.js';
import {
  renderBrokenImageBlock,
  renderEmptyImageBlock,
  renderUnlockedImageBlock,
  SecretImageRenderChild,
} from './components/secret-image-blocks.js';
import {
  countSecretImageReferences,
  readSecretImageFile,
  trashSecretImageFile,
  writeSecretImageFile,
} from './secretimage-store.js';
import { SecretNotesSettingTab } from './settings.js';
import { t } from './i18n/index.js';
import { detectImageFormat, sanitizeFilename } from './utils.js';
import type { NormalizedSecretImagePayload, SecretImagePayload, SecretNotesSettings } from './types.js';

export default class SecretNotesPlugin extends Plugin {
  settings: SecretNotesSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new SecretNotesSettingTab(this));
    this.registerProcessor();
    // The secretimage block name is fixed on purpose: renaming would orphan existing blocks.
    this.registerMarkdownCodeBlockProcessor(SECRETIMAGE_LANG, (source, el, ctx) => {
      this.processSecretImageBlock(source, el, ctx);
    });
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as SecretNotesSettings;
    this.settings = { ...DEFAULT_SETTINGS, ...data };
    // defensive: "secretimage" is reserved for the image processor
    if (!this.settings.blockName || this.settings.blockName.toLowerCase() === SECRETIMAGE_LANG) {
      this.settings.blockName = DEFAULT_SETTINGS.blockName;
    }
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

  private processSecretBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
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
  }

  private processSecretImageBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const payload = parseSecretImagePayload(source);

    if (payload) {
      renderEncryptedBlock(el, payload, {
        onView: () => this.unlockImage(payload, ctx, el),
      });
      return;
    }

    if (source.trim() === '') {
      renderEmptyImageBlock(el, {
        onAdd: (file) => void this.encryptImageFile(file, ctx, el),
      });
      return;
    }

    // Non-empty but unparseable: never offer "add image" here, the broken JSON
    // may still be repairable by hand.
    renderBrokenImageBlock(el);
  }

  private async encryptImageFile(file: File, ctx: MarkdownPostProcessorContext, el: HTMLElement): Promise<void> {
    if (file.size > MAX_IMAGE_BYTES) {
      new Notice(t('图片过大，最大支持 $1', `${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`));
      return;
    }

    const buffer = await file.arrayBuffer();
    const format = detectImageFormat(new Uint8Array(buffer));
    if (!format) {
      new Notice(t('不支持的图片格式，仅支持 PNG/JPEG/GIF/WebP'));
      return;
    }

    const input = await new ImageCryptorModal(this.app).openImageEncrypt();
    if (!input) {
      return;
    }

    const parts = await encryptBytes(buffer, input.password).catch((e) => {
      console.error(e);
      return null;
    });
    if (!parts) {
      new Notice(t('加密失败，请稍后重试'));
      return;
    }

    const name = await writeSecretImageFile(this.app.vault, parts).catch((e) => {
      console.error(e);
      return null;
    });
    if (!name) {
      new Notice(t('加密失败，请稍后重试'));
      return;
    }

    const payload: NormalizedSecretImagePayload = {
      v: SECRET_VERSION,
      title: input.title,
      hint: input.hint,
      date: new Date().toISOString(),
      image: { name, ext: format.ext },
    };

    const replaced = await this.replaceSecretBlock(
      ctx,
      el,
      serializeSecretFence(payload as SecretImagePayload, SECRETIMAGE_LANG),
    );
    if (!replaced) {
      // roll back the orphaned ciphertext
      await trashSecretImageFile(this.app.vault, name);
    }
  }

  private async unlockImage(
    payload: NormalizedSecretImagePayload,
    ctx: MarkdownPostProcessorContext,
    el: HTMLElement,
  ): Promise<void> {
    const verify = async (password: string): Promise<ArrayBuffer> => {
      const text = await readSecretImageFile(this.app.vault, payload.image.name).catch((e) => {
        console.error(e);
        new Notice(t('加密图片文件丢失，请检查 .secretimage 文件夹'));
        return null;
      });
      if (!text) {
        throw new Error(`secret image file not found: ${payload.image.name}`);
      }

      const parts = parseEncryptedParts(text);
      if (!parts) {
        new Notice(t('加密图片文件已损坏'));
        throw new Error('corrupted secret image file');
      }

      try {
        return await decryptBytes(parts, password);
      } catch (e) {
        console.error(e);
        new Notice(t('密码错误，解密失败'));
        throw e;
      }
    };

    const buffer = await new ImageCryptorModal(this.app).openImageUnlock(payload, verify);
    if (!buffer) {
      return;
    }

    const detected = detectImageFormat(new Uint8Array(buffer));
    if (detected && detected.ext !== payload.image.ext) {
      new Notice(t('图片格式与记录不符，文件可能被替换过'));
    }
    const mime = detected?.mime ?? `image/${payload.image.ext}`;

    const url = URL.createObjectURL(new Blob([buffer], { type: mime }));
    // safety net: revoke when the block leaves the DOM (rerender / close / unload)
    ctx.addChild(new SecretImageRenderChild(el, () => URL.revokeObjectURL(url)));

    const lock = () => {
      URL.revokeObjectURL(url);
      renderEncryptedBlock(el, payload, {
        onView: () => this.unlockImage(payload, ctx, el),
      });
    };

    renderUnlockedImageBlock(el, payload, {
      blobUrl: url,
      onRelock: lock,
      onExport: () =>
        void this.exportImageAsAttachment({ payload, buffer, blobUrl: url, ctx, el }).catch(console.error),
    });
  }

  private async exportImageAsAttachment(opts: {
    payload: NormalizedSecretImagePayload;
    buffer: ArrayBuffer;
    blobUrl: string;
    ctx: MarkdownPostProcessorContext;
    el: HTMLElement;
  }): Promise<void> {
    const { payload, buffer, blobUrl, ctx, el } = opts;

    // counted BEFORE replacing this block; >1 means someone else still holds a reference
    const references = await countSecretImageReferences(this.app.vault, payload.image.name);

    const detected = detectImageFormat(new Uint8Array(buffer));
    const ext = detected?.ext ?? payload.image.ext;
    const filename = `${sanitizeFilename(payload.title) || 'secret-image'}.${ext}`;

    const file = await this.writeImageAttachment(filename, buffer, ctx.sourcePath).catch((e) => {
      console.error(e);
      return null;
    });
    if (!file) {
      new Notice(t('写入图片文件失败'));
      return;
    }

    const embed = `!${this.app.fileManager.generateMarkdownLink(file, ctx.sourcePath)}`;
    const replaced = await this.replaceSecretBlock(ctx, el, `${embed}\n`);

    URL.revokeObjectURL(blobUrl);

    if (!replaced) {
      return;
    }

    if (references > 1) {
      new Notice(t('加密图片仍被引用，已保留加密文件'));
    } else {
      await trashSecretImageFile(this.app.vault, payload.image.name);
    }

    new Notice(t('已导出为普通图片'));
  }

  private async writeImageAttachment(
    filename: string,
    buffer: ArrayBuffer,
    sourcePath: string,
  ): Promise<TFile> {
    const path = await this.app.fileManager.getAvailablePathForAttachment(filename, sourcePath);
    return this.app.vault.createBinary(path, buffer);
  }

  /** Returns false when the block could not be located/replaced. */
  private async replaceSecretBlock(
    ctx: MarkdownPostProcessorContext,
    el: HTMLElement,
    replacement: string,
  ): Promise<boolean> {
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) {
      new Notice(t('无法定位当前 secret 代码块'));
      return false;
    }

    const file = this.app.vault.getFileByPath(ctx.sourcePath);
    if (!file) {
      new Notice(t('无法找到当前文件'));
      return false;
    }

    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView?.file?.path === file.path && activeView.getMode() === 'source') {
      this.replaceBlockInEditor(activeView, sectionInfo, replacement);
    } else {
      await this.replaceBlockInFile(file, sectionInfo, replacement);
    }

    return true;
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
