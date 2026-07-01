import { type Modal } from 'obsidian';
import { InputElementOptions } from '../types.js';

export function createForm(modal: Modal, inputs: InputElementOptions[], onYes: (form: HTMLFormElement) => void) {
  const form = modal.contentEl.createEl('form', { cls: 'secret-notes__encrypt-form' });

  // # input elements
  for (let i = 0; i < inputs.length; i++) {
    const o = inputs[i];
    const labelEl = form.createDiv({ cls: 'secret-notes__field-label' });
    labelEl.createSpan({ text: o.label });
    if (o.required) {
      labelEl.createSpan({ cls: 'secret-notes__required-mark', text: '*' });
    }
    let field: HTMLTextAreaElement | HTMLInputElement;
    if (o.type === 'textarea') {
      field = form.createEl('textarea');
    } else {
      field = form.createEl('input');
      field.type = o.type ?? 'text';
    }
    field.name = o.name;
    field.value = o.value ?? '';

    if (o.focus) {
      setTimeout(() => field.focus(), 100);
    }
  }

  // # footer
  const footer = modal.contentEl.createDiv({ cls: 'secret-notes-card__actions' });
  footer.createEl('button', { text: '取消', type: 'button' }).addEventListener('click', () => modal.close());
  footer
    .createEl('button', { text: '确认', cls: 'mod-cta secret-notes-button', type: 'button' })
    .addEventListener('click', () => onYes(form));

  return form;
}
