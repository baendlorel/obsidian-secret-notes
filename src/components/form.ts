import { type Modal } from 'obsidian';
import { InputElementOptions } from '../types.js';

export function createForm(modal: Modal, inputs: InputElementOptions[], onYes: () => void) {
  const form = modal.contentEl.createEl('form', { cls: 'secret-notes__encrypt-form' });

  // # input elements
  for (let i = 0; i < inputs.length; i++) {
    const o = inputs[i];
    const labelEl = form.createDiv({ cls: 'secret-notes__field-label' });
    labelEl.createSpan({ text: o.label });
    if (o.required) {
      labelEl.createSpan({ cls: 'secret-notes__required-mark', text: '*' });
    }
    const field = form.createEl('input');
    field.type = o.type;
    field.name = o.name;
    field.value = o.value ?? '';
  }

  // # footer
  const footer = form.createDiv({ cls: 'secret-notes-card__actions' });
  footer.createEl('button', { text: '取消' }).addEventListener('click', () => modal.close());
  footer
    .createEl('button', { text: '确认', cls: 'mod-cta secret-notes-button' })
    .addEventListener('click', () => onYes());
}
