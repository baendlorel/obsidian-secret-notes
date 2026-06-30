import { Editor, MarkdownPostProcessorContext, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { SECRET_LANG } from './constants';
import { decryptSecret, encryptSecret } from './crypto';
import { SecretEditorModal, SecretFormModal } from './modals';
import { findSecretBlocks, parseSecretPayload, renderPlainPlaceholder, serializeSecretFence } from './secret-blocks';
import type { SecretBlock, SecretPayload, SessionState } from './types';
import { buildStateKey, computeBlockedUntil } from './utils';

export default class SecretNotesPlugin extends Plugin {
  private sessionState = new Map<string, SessionState>();
  private activePlainBlockByFile = new Map<string, SecretBlock>();
  private suppressedPlainBlockByFile = new Map<string, string>();
  private isEncryptionPromptOpen = false;
  private isProgrammaticChange = false;

  async onload(): Promise<void> {
    this.registerMarkdownCodeBlockProcessor(SECRET_LANG, (source, el, ctx) => {
      this.renderSecretBlock(source, el, ctx);
    });

    this.registerEvent(
      this.app.workspace.on('editor-change', (editor, info) => {
        if (this.isProgrammaticChange) {
          return;
        }

        if (!(info instanceof MarkdownView)) {
          return;
        }

        if (info.getMode() === 'preview') {
          void this.encryptPlainBlocksInEditor(editor, info.file);
        }
      }),
    );

    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        void this.encryptActivePreviewBlocks();
      }),
    );

    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (!file) {
          this.sessionState.clear();
          this.activePlainBlockByFile.clear();
          this.suppressedPlainBlockByFile.clear();
          return;
        }

        for (const key of [...this.sessionState.keys()]) {
          if (!key.startsWith(`${file.path}::`)) {
            this.sessionState.delete(key);
          }
        }

        for (const path of [...this.activePlainBlockByFile.keys()]) {
          if (path !== file.path) {
            this.activePlainBlockByFile.delete(path);
          }
        }

        for (const path of [...this.suppressedPlainBlockByFile.keys()]) {
          if (path !== file.path) {
            this.suppressedPlainBlockByFile.delete(path);
          }
        }
      }),
    );

    this.registerInterval(
      window.setInterval(() => {
        void this.encryptBlockAfterCursorLeaves();
      }, 250),
    );
  }

  private async encryptBlockAfterCursorLeaves(): Promise<void> {
    if (this.isProgrammaticChange || this.isEncryptionPromptOpen) {
      return;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) {
      return;
    }

    if (view.getMode() !== 'source') {
      this.activePlainBlockByFile.delete(view.file.path);
      return;
    }

    const editor = view.editor;
    const currentBlock = this.findPlainBlockAtCursor(editor);
    const previousBlock = this.activePlainBlockByFile.get(view.file.path);
    const suppressedToken = this.suppressedPlainBlockByFile.get(view.file.path);

    if (currentBlock) {
      const currentToken = this.getBlockToken(currentBlock);
      if (suppressedToken === currentToken) {
        this.suppressedPlainBlockByFile.delete(view.file.path);
      }
    }

    if (previousBlock && (!currentBlock || previousBlock.from !== currentBlock.from)) {
      if (suppressedToken === this.getBlockToken(previousBlock)) {
        this.activePlainBlockByFile.delete(view.file.path);
        return;
      }

      await this.encryptSpecificBlockInEditor(editor, view.file, previousBlock);
      this.syncTrackedPlainBlock(view.file.path, editor);
      return;
    }

    if (currentBlock) {
      this.activePlainBlockByFile.set(view.file.path, currentBlock);
      return;
    }

    this.activePlainBlockByFile.delete(view.file.path);
  }

  private async encryptActivePreviewBlocks(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.getMode() !== 'preview') {
      return;
    }

    await this.encryptPlainBlocksInEditor(view.editor, view.file);
  }

  private async encryptPlainBlocksInEditor(editor: Editor, file: TFile | null): Promise<void> {
    if (!file) {
      return;
    }

    const content = editor.getValue();
    const blocks = findSecretBlocks(content);
    const plainBlocks = blocks.filter((block) => !parseSecretPayload(block.content));

    if (plainBlocks.length === 0) {
      return;
    }

    let nextContent = content;
    let mutated = false;

    for (let index = plainBlocks.length - 1; index >= 0; index -= 1) {
      const block = plainBlocks[index];
      const stateKey = buildStateKey(file.path, block.from);
      const session = this.getOrCreateSession(stateKey);

      const result = await SecretFormModal.openForEncrypt(this.app, {
        initialHint: '',
        initialTitle: '',
        password: session.password,
      });

      if (!result) {
        new Notice('Skipped encrypting a secret block.');
        continue;
      }

      const payload = await encryptSecret(block.content, result.password, {
        title: result.title,
        hint: result.hint,
      });

      session.password = result.password;
      session.lastPlaintext = block.content;
      session.failureCount = 0;
      session.blockedUntil = 0;

      const replacement = serializeSecretFence(payload);
      nextContent = `${nextContent.slice(0, block.from)}${replacement}${nextContent.slice(block.to)}`;
      mutated = true;
    }

    if (!mutated) {
      return;
    }

    this.isProgrammaticChange = true;
    editor.setValue(nextContent);
    this.isProgrammaticChange = false;
    new Notice('Encrypted secret block(s).');
  }

  private async encryptSpecificBlockInEditor(editor: Editor, file: TFile, block: SecretBlock): Promise<void> {
    if (this.isEncryptionPromptOpen) {
      return;
    }

    const content = editor.getValue();
    const liveBlock = findSecretBlocks(content).find(
      (candidate) =>
        candidate.lineStart === block.lineStart &&
        candidate.lineEnd === block.lineEnd &&
        !parseSecretPayload(candidate.content),
    );

    if (!liveBlock) {
      return;
    }

    const stateKey = buildStateKey(file.path, liveBlock.from);
    const session = this.getOrCreateSession(stateKey);
    this.isEncryptionPromptOpen = true;
    const result = await SecretFormModal.openForEncrypt(this.app, {
      initialHint: '',
      initialTitle: '',
      password: session.password,
    });
    this.isEncryptionPromptOpen = false;

    if (!result) {
      this.suppressedPlainBlockByFile.set(file.path, this.getBlockToken(liveBlock));
      this.activePlainBlockByFile.delete(file.path);
      new Notice('Skipped encrypting a secret block.');
      return;
    }

    this.suppressedPlainBlockByFile.delete(file.path);

    const payload = await encryptSecret(liveBlock.content, result.password, {
      title: result.title,
      hint: result.hint,
    });

    session.password = result.password;
    session.lastPlaintext = liveBlock.content;
    session.failureCount = 0;
    session.blockedUntil = 0;

    const replacement = serializeSecretFence(payload);
    const nextContent = `${content.slice(0, liveBlock.from)}${replacement}${content.slice(liveBlock.to)}`;

    this.isProgrammaticChange = true;
    editor.setValue(nextContent);
    this.isProgrammaticChange = false;
    new Notice('Encrypted secret block.');
  }

  private renderSecretBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
    const payload = parseSecretPayload(source);
    if (!payload) {
      const section = ctx.getSectionInfo(el);
      renderPlainPlaceholder(el, async () => {
        if (!section) {
          new Notice('Cannot resolve secret block position.');
          return;
        }

        if (this.isEncryptionPromptOpen) {
          return;
        }

        const stateKey = buildStateKey(ctx.sourcePath, section.lineStart);
        const session = this.getOrCreateSession(stateKey);

        this.isEncryptionPromptOpen = true;
        const result = await SecretFormModal.openForEncrypt(this.app, {
          initialHint: '',
          initialTitle: '',
          password: session.password,
        });
        this.isEncryptionPromptOpen = false;

        if (!result) {
          new Notice('Skipped encrypting a secret block.');
          return;
        }

        const nextPayload = await encryptSecret(source, result.password, {
          title: result.title,
          hint: result.hint,
        });

        session.password = result.password;
        session.lastPlaintext = source;
        session.failureCount = 0;
        session.blockedUntil = 0;

        await this.replaceBlockBySection(ctx.sourcePath, section.lineStart, section.lineEnd, nextPayload);
        new Notice('Secret block encrypted.');
      });
      return;
    }

    const section = ctx.getSectionInfo(el);
    const stateKey = section ? buildStateKey(ctx.sourcePath, section.lineStart) : null;
    const session = stateKey ? this.getOrCreateSession(stateKey) : null;

    el.empty();
    el.addClass('secret-notes-panel');

    const card = el.createDiv({ cls: 'secret-notes-card' });
    card.createDiv({ cls: 'secret-notes-card__badge', text: '已加密' });

    if (payload.title) {
      card.createDiv({ cls: 'secret-notes-card__title', text: payload.title });
    }

    card.createDiv({ cls: 'secret-notes-card__meta', text: `加密时间：${payload.date}` });

    if (session && session.blockedUntil > Date.now()) {
      const waitSeconds = Math.ceil((session.blockedUntil - Date.now()) / 1000);
      card.createDiv({
        cls: 'secret-notes-card__warning',
        text: `请等待 ${waitSeconds} 秒后再次尝试。`,
      });
    }

    const actions = card.createDiv({ cls: 'secret-notes-card__actions' });
    const decryptButton = actions.createEl('button', {
      cls: 'mod-cta secret-notes-button',
      text: '解密并编辑',
    });

    decryptButton.addEventListener('click', async () => {
      if (!stateKey || !section) {
        new Notice('Cannot resolve secret block position.');
        return;
      }

      const activeSession = this.getOrCreateSession(stateKey);
      if (activeSession.blockedUntil > Date.now()) {
        const waitSeconds = Math.ceil((activeSession.blockedUntil - Date.now()) / 1000);
        new Notice(`Please wait ${waitSeconds} seconds before trying again.`);
        return;
      }

      const result = await SecretFormModal.openForDecrypt(this.app, {
        hint: activeSession.failureCount > 0 ? (payload.hint ?? '') : '',
        password: activeSession.password,
      });

      if (!result) {
        return;
      }

      try {
        const plaintext = await decryptSecret(payload, result.password);
        activeSession.password = result.password;
        activeSession.lastPlaintext = plaintext;
        activeSession.failureCount = 0;
        activeSession.blockedUntil = 0;

        const editorResult = await SecretEditorModal.openForEdit(this.app, {
          plaintext,
          title: payload.title ?? '',
          hint: payload.hint ?? '',
        });

        if (!editorResult) {
          return;
        }

        const nextPayload = await encryptSecret(editorResult.plaintext, result.password, {
          title: editorResult.title,
          hint: editorResult.hint,
        });

        activeSession.lastPlaintext = editorResult.plaintext;
        await this.replaceBlockBySection(ctx.sourcePath, section.lineStart, section.lineEnd, nextPayload);
        new Notice('Secret block updated.');
      } catch {
        activeSession.failureCount += 1;
        activeSession.blockedUntil = computeBlockedUntil(activeSession.failureCount, Date.now());
        new Notice('Incorrect password.');
      }
    });
  }

  private async replaceBlockBySection(
    sourcePath: string,
    lineStart: number,
    lineEnd: number,
    payload: SecretPayload,
  ): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(file instanceof TFile)) {
      throw new Error('Target file not found.');
    }

    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const replacement = serializeSecretFence(payload).replace(/\n$/, '').split('\n');
    const nextLines = [...lines.slice(0, lineStart), ...replacement, ...lines.slice(lineEnd + 1)];
    await this.app.vault.modify(file, nextLines.join('\n'));
  }

  private getOrCreateSession(key: string): SessionState {
    const existing = this.sessionState.get(key);
    if (existing) {
      return existing;
    }

    const session: SessionState = {
      failureCount: 0,
      blockedUntil: 0,
    };
    this.sessionState.set(key, session);
    return session;
  }

  private findPlainBlockAtCursor(editor: Editor): SecretBlock | null {
    const cursorLine = editor.getCursor('head').line;
    const blocks = findSecretBlocks(editor.getValue());
    return (
      blocks.find(
        (block) => block.lineStart <= cursorLine && cursorLine <= block.lineEnd && !parseSecretPayload(block.content),
      ) ?? null
    );
  }

  private syncTrackedPlainBlock(filePath: string, editor: Editor): void {
    const currentBlock = this.findPlainBlockAtCursor(editor);
    if (currentBlock) {
      this.activePlainBlockByFile.set(filePath, currentBlock);
      return;
    }

    this.activePlainBlockByFile.delete(filePath);
  }

  private getBlockToken(block: SecretBlock): string {
    return `${block.lineStart}:${block.lineEnd}`;
  }
}
