import { Notice, PluginSettingTab, Setting } from 'obsidian';
import type SecretNotesPlugin from './main.js';
import { SECRETIMAGE_LANG } from './consts.js';
import { t } from './i18n/index.js';

export class SecretNotesSettingTab extends PluginSettingTab {
  private readonly plugin: SecretNotesPlugin;

  constructor(plugin: SecretNotesPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t('块名称'))
      .setDesc(t('决定哪种代码块会被本插件读取'))
      .addText((text) =>
        text
          .setPlaceholder('secret')
          .setValue(this.plugin.settings.blockName)
          .onChange(async (value) => {
            const name = value.trim() || 'secret';
            if (name.toLowerCase() === SECRETIMAGE_LANG) {
              new Notice(t('块名称不能是 secretimage'));
              text.setValue(this.plugin.settings.blockName);
              return;
            }
            this.plugin.settings.blockName = name;
            await this.plugin.applySettings();
          }),
      );
  }
}
