import { PluginSettingTab, Setting } from 'obsidian';
import type SecretNotesPlugin from './main.js';
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
            this.plugin.settings.blockName = value.trim() || 'secret';
            await this.plugin.applySettings();
          }),
      );
  }
}
