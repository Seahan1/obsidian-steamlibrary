import { App, PluginSettingTab, SecretComponent, Setting } from 'obsidian';
import type SteamLibraryPlugin from './main';
import { getSyncProgressLabel, getSyncProgressPercent, isSyncRunning } from './sync-progress';

export interface SteamPluginSettings {
	steamId: string;
	apiKeySecretId: string;
	dataFolder: string;
	activityFolder: string;
	autoSyncEnabled: boolean;
	lastAutoSyncDate: string;
}

export const DEFAULT_SETTINGS: SteamPluginSettings = {
	steamId: '',
	apiKeySecretId: '',
	dataFolder: 'Steam Games',
	activityFolder: 'Steam Activity',
	autoSyncEnabled: false,
	lastAutoSyncDate: '',
};

export class SteamSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: SteamLibraryPlugin) { super(app, plugin); }

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName('Steam 游戏库').setHeading();
		containerEl.createEl('p', { text: '同步时会把 SteamID64 与 API Key 发送至 Steam Web API。不会发送笔记或其他保险库数据。' });
		new Setting(containerEl).setName('SteamID64').setDesc('请输入 17 位 SteamID64。Steam 个人资料和游戏详情需要对 API 可见。').addText((text) => text.setPlaceholder('7656119…').setValue(this.plugin.settings.steamId).onChange(async (value) => { this.plugin.settings.steamId = value.trim(); await this.plugin.saveSettings(); }));
		new Setting(containerEl).setName('Steam Web API Key').setDesc('通过 Obsidian Secret Storage 保存；插件设置只记录秘密引用。').addComponent((component) => new SecretComponent(this.app, component).setValue(this.plugin.settings.apiKeySecretId).onChange(async (value) => { this.plugin.settings.apiKeySecretId = value; await this.plugin.saveSettings(); }));
		new Setting(containerEl).setName('Dataview 数据目录').setDesc('同步后会在这个目录生成每个游戏的 Markdown 数据文件。').addText((text) => text.setPlaceholder('Steam Games').setValue(this.plugin.settings.dataFolder).onChange(async (value) => { this.plugin.settings.dataFolder = value.trim(); await this.plugin.saveSettings(); }));
		new Setting(containerEl).setName('热力图数据目录').setDesc('同步后会在这个目录生成每日游玩强度 Markdown 文件。').addText((text) => text.setPlaceholder('Steam Activity').setValue(this.plugin.settings.activityFolder).onChange(async (value) => { this.plugin.settings.activityFolder = value.trim(); await this.plugin.saveSettings(); }));
		new Setting(containerEl).setName('每天自动同步一次').setDesc('Obsidian 打开时每天自动同步一次；如果当天没有打开，会在下次打开后补跑。').addToggle((toggle) => toggle.setValue(this.plugin.settings.autoSyncEnabled).onChange(async (value) => { this.plugin.settings.autoSyncEnabled = value; await this.plugin.saveSettings(); }));
		new Setting(containerEl)
			.setName('同步 Steam 游戏库')
			.setDesc('读取游戏列表后逐个同步成就，游戏较多时需要等待。')
			.addButton((button) => button
				.setButtonText(isSyncRunning(this.plugin.syncProgress) ? '同步中' : '开始同步')
				.setCta()
				.setDisabled(isSyncRunning(this.plugin.syncProgress))
				.onClick(() => { void this.plugin.syncLibrary(); }));

		const syncStatus = containerEl.createDiv({ cls: 'steam-settings-sync' });
		syncStatus.createDiv({ cls: 'steam-settings-sync__label', text: getSyncProgressLabel(this.plugin.syncProgress) });
		syncStatus.createEl('progress', {
			cls: 'steam-settings-sync__progress',
			attr: {
				'aria-label': 'Steam 游戏库同步进度',
				max: '100',
				value: String(getSyncProgressPercent(this.plugin.syncProgress)),
			},
		});
	}
}
