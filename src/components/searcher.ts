import { setIcon } from 'obsidian';
import { t } from '../i18n/index.js';

interface SearcherState {
  query: string;
  matches: number[];
  current: number;
}

export class Searcher {
  private container: HTMLDivElement;
  private input: HTMLInputElement;
  private countLabel: HTMLSpanElement;
  private textarea: HTMLTextAreaElement;
  private state: SearcherState = { query: '', matches: [], current: -1 };
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(textarea: HTMLTextAreaElement) {
    this.textarea = textarea;

    // Wrap textarea + searcher in a relative-positioned container
    const parent = textarea.parentElement!;
    const wrapper = parent.createDiv({ cls: 'secret-notes-searcher__wrapper' });
    wrapper.appendChild(textarea);

    // Container (search bar, absolute-positioned top-right)
    this.container = wrapper.createDiv({ cls: 'secret-notes-searcher' });

    // Search input
    this.input = this.container.createEl('input', {
      cls: 'secret-notes-searcher__input',
      attr: { type: 'text', placeholder: t('搜索') },
    });

    // Count label (e.g. "1/5")
    this.countLabel = this.container.createSpan({ cls: 'secret-notes-searcher__count' });

    // Previous button
    const prevBtn = this.container.createEl('button', {
      cls: 'secret-notes-searcher__btn',
      attr: { type: 'button', title: t('上一个') },
    });
    setIcon(prevBtn, 'chevron-up');

    // Next button
    const nextBtn = this.container.createEl('button', {
      cls: 'secret-notes-searcher__btn',
      attr: { type: 'button', title: t('下一个') },
    });
    setIcon(nextBtn, 'chevron-down');

    // Close button
    const closeBtn = this.container.createEl('button', {
      cls: 'secret-notes-searcher__btn secret-notes-searcher__btn--close',
      attr: { type: 'button' },
    });
    setIcon(closeBtn, 'x');

    // Event listeners
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        this.show();
      }
    };
    this.textarea.addEventListener('keydown', this.keydownHandler);

    this.input.addEventListener('input', () => this.search(this.input.value));
    this.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        this.input.select();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.prev();
        } else {
          this.next();
        }
      } else if (e.key === 'Escape') {
        this.hide();
      }
    });

    prevBtn.addEventListener('click', () => this.prev());
    nextBtn.addEventListener('click', () => this.next());
    closeBtn.addEventListener('click', () => this.hide());
  }

  show(): void {
    this.container.classList.add('secret-notes-searcher--visible');
    this.input.focus();
    this.input.select();
  }

  hide(): void {
    this.container.classList.remove('secret-notes-searcher--visible');
    this.textarea.focus();
  }

  private search(query: string): void {
    this.state.query = query;

    if (!query) {
      this.state.matches = [];
      this.state.current = -1;
      this.updateCount();
      return;
    }

    const text = this.textarea.value.toLowerCase();
    const q = query.toLowerCase();
    const matches: number[] = [];

    let pos = 0;
    while (true) {
      const idx = text.indexOf(q, pos);
      if (idx === -1) break;
      matches.push(idx);
      pos = idx + 1;
    }

    this.state.matches = matches;

    if (matches.length === 0) {
      this.state.current = -1;
    } else {
      // Find the first match at or after the current cursor position
      const cursorPos = this.textarea.selectionStart;
      const nextIdx = matches.findIndex((m) => m >= cursorPos);
      this.state.current = nextIdx === -1 ? 0 : nextIdx;
      this.selectCurrentMatch();
    }

    this.updateCount();
  }

  next(): void {
    if (this.state.matches.length === 0) return;
    this.state.current = (this.state.current + 1) % this.state.matches.length;
    this.selectCurrentMatch();
    this.updateCount();
  }

  prev(): void {
    if (this.state.matches.length === 0) return;
    this.state.current = (this.state.current - 1 + this.state.matches.length) % this.state.matches.length;
    this.selectCurrentMatch();
    this.updateCount();
  }

  private selectCurrentMatch(): void {
    if (this.state.current === -1 || this.state.matches.length === 0) return;
    const start = this.state.matches[this.state.current];
    const end = start + this.state.query.length;
    this.textarea.setSelectionRange(start, end);
    this.textarea.focus();
    this.scrollToSelection(start);
  }

  private scrollToSelection(pos: number): void {
    // Calculate approximate line height and scroll position
    const textBefore = this.textarea.value.substring(0, pos);
    const lineNumber = textBefore.split('\n').length - 1;
    const lineHeight = parseFloat(getComputedStyle(this.textarea).lineHeight) || 20;
    const scrollTop = lineNumber * lineHeight - this.textarea.clientHeight / 2;
    this.textarea.scrollTop = Math.max(0, scrollTop);
  }

  private updateCount(): void {
    if (this.state.matches.length === 0) {
      if (this.state.query) {
        this.countLabel.textContent = t('无结果');
      } else {
        this.countLabel.textContent = '';
      }
    } else {
      this.countLabel.textContent = `${this.state.current + 1}/${this.state.matches.length}`;
    }
  }

  destroy(): void {
    this.textarea.removeEventListener('keydown', this.keydownHandler);
    this.container.remove();
  }
}
