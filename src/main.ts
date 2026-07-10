import { Notice, Plugin, TFile } from 'obsidian';
import { buildSteamActivityNote, calculateDailyActivity, getSteamActivityNotePath, mergeDailyActivity, type DailySteamActivity } from './activity-note';
import { shouldRunDailyAutoSync } from './auto-sync';
import { SteamDashboardModal } from './dashboard-modal';
import { buildSteamGameNote, getSteamGameNotePath } from './game-note';
import { DEFAULT_SETTINGS, SteamSettingTab, type SteamPluginSettings } from './settings';
import { SteamApiClient } from './steam-api';
import { createIdleSyncProgress, isSyncRunning, type SyncProgress } from './sync-progress';
import type { SteamGame, SteamLibrarySnapshot } from './types';

export default class SteamLibraryPlugin extends Plugin {
	settings!: SteamPluginSettings;
	snapshot?: SteamLibrarySnapshot;
	activities: Record<string, DailySteamActivity> = {};
	syncProgress: SyncProgress = createIdleSyncProgress();
	private settingTab?: SteamSettingTab;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.settingTab = new SteamSettingTab(this.app, this);
		this.addSettingTab(this.settingTab);
		this.addRibbonIcon('gamepad-2', '打开 Steam 游戏总结', () => this.openDashboard());
		this.addCommand({ id: 'sync-library', name: '同步 Steam 游戏库', callback: () => this.syncLibrary() });
		this.addCommand({ id: 'open-dashboard', name: '打开 Steam 游戏总结', callback: () => this.openDashboard() });
		this.registerInterval(window.setInterval(() => { void this.runDailyAutoSync(); }, 5 * 60 * 1000));
		void this.runDailyAutoSync();
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<SteamPluginSettings & { snapshot?: SteamLibrarySnapshot; activities?: Record<string, DailySteamActivity> }> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...data };
		this.snapshot = data?.snapshot;
		this.activities = data?.activities ?? {};
	}

	async saveSettings(): Promise<void> {
		await this.saveData({ ...this.settings, snapshot: this.snapshot, activities: this.activities });
	}

	async syncLibrary(): Promise<boolean> {
		if (isSyncRunning(this.syncProgress)) {
			new Notice('Steam 游戏库正在同步中。');
			return false;
		}

		const apiKey = this.getApiKey();
		if (apiKey === undefined || this.settings.steamId.length === 0) {
			new Notice('请先在 Steam 游戏库设置中填写 SteamID64 并选择 API Key。');
			return false;
		}
		if (this.settings.dataFolder.length === 0) {
			new Notice('请先在 Steam 游戏库设置中填写 Dataview 数据目录。');
			return false;
		}
		if (this.settings.activityFolder.length === 0) {
			new Notice('请先在 Steam 游戏库设置中填写热力图数据目录。');
			return false;
		}
		new Notice('正在同步 Steam 游戏库…');
		this.updateSyncProgress({ phase: 'loading-games', completed: 0, total: 0 });
		try {
			const previousSnapshot = this.snapshot;
			const client = new SteamApiClient(apiKey, this.settings.steamId);
			const games = await client.getOwnedGames();
			this.updateSyncProgress({ phase: 'achievements', completed: 0, total: games.length });
			const gamesWithAchievements = await this.fetchAchievements(client, games);
			const syncedAt = new Date().toISOString();
			const activity = calculateDailyActivity(previousSnapshot?.games, gamesWithAchievements, syncedAt.slice(0, 10), syncedAt);
			const mergedActivity = mergeDailyActivity(this.activities[activity.date], activity);
			this.activities[activity.date] = mergedActivity;
			this.snapshot = { syncedAt, games: gamesWithAchievements };
			await this.saveSettings();
			await this.writeGameNotes(gamesWithAchievements, syncedAt);
			await this.writeActivityNote(mergedActivity);
			this.updateSyncProgress({ phase: 'completed', completed: gamesWithAchievements.length, total: gamesWithAchievements.length });
			new Notice(`Steam 游戏库已同步：${gamesWithAchievements.length} 款游戏。`);
			return true;
		} catch {
			this.updateSyncProgress({ phase: 'failed', completed: 0, total: 0 });
			new Notice('Steam 同步失败。请检查 SteamID64、API Key 与个人资料可见性。');
			return false;
		}
	}

	openDashboard(): void {
		if (this.snapshot === undefined) {
			new Notice('还没有同步的数据。请先运行“同步 Steam 游戏库”。');
			return;
		}
		new SteamDashboardModal(this.app, this.snapshot).open();
	}

	private getApiKey(): string | undefined {
		if (this.settings.apiKeySecretId.length === 0) {
			return undefined;
		}

		const secret = this.app.secretStorage.getSecret(this.settings.apiKeySecretId);
		return secret ?? undefined;
	}

	private async fetchAchievements(client: SteamApiClient, games: SteamGame[]): Promise<SteamGame[]> {
		const result: SteamGame[] = [];
		for (const game of games) {
			const achievements = await client.getAchievementProgress(game.appid);
			result.push({ ...game, ...(achievements === undefined ? {} : { achievements }) });
			this.updateSyncProgress({ phase: 'achievements', completed: result.length, total: games.length });
		}
		return result;
	}

	private async writeGameNotes(games: SteamGame[], syncedAt: string): Promise<void> {
		await this.ensureFolder(this.settings.dataFolder);
		this.updateSyncProgress({ phase: 'writing-notes', completed: 0, total: games.length });
		let completed = 0;
		for (const game of games) {
			const path = getSteamGameNotePath(this.settings.dataFolder, game);
			const content = buildSteamGameNote(game, syncedAt);
			const existing = this.app.vault.getAbstractFileByPath(path);
			if (existing === null) {
				await this.app.vault.create(path, content);
			} else if (existing instanceof TFile) {
				await this.app.vault.modify(existing, content);
			} else {
				throw new Error(`${path} 是文件夹，无法写入游戏数据。`);
			}
			completed += 1;
			this.updateSyncProgress({ phase: 'writing-notes', completed, total: games.length });
		}
	}

	private async writeActivityNote(activity: DailySteamActivity): Promise<void> {
		await this.ensureFolder(this.settings.activityFolder);
		const path = getSteamActivityNotePath(this.settings.activityFolder, activity);
		const content = buildSteamActivityNote(activity);
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing === null) {
			await this.app.vault.create(path, content);
		} else if (existing instanceof TFile) {
			await this.app.vault.modify(existing, content);
		} else {
			throw new Error(`${path} 是文件夹，无法写入热力图数据。`);
		}
	}

	private async runDailyAutoSync(): Promise<void> {
		const today = new Date().toISOString().slice(0, 10);
		if (!shouldRunDailyAutoSync(this.settings.autoSyncEnabled, this.settings.lastAutoSyncDate, today)) {
			return;
		}

		const synced = await this.syncLibrary();
		if (synced) {
			this.settings.lastAutoSyncDate = today;
			await this.saveSettings();
			this.settingTab?.display();
		}
	}

	private async ensureFolder(folder: string): Promise<void> {
		const normalizedFolder = folder.trim().replace(/^\/+|\/+$/g, '');
		const parts = normalizedFolder.split('/').filter((part) => part.length > 0);
		let currentPath = '';
		for (const part of parts) {
			currentPath = currentPath.length === 0 ? part : `${currentPath}/${part}`;
			const existing = this.app.vault.getAbstractFileByPath(currentPath);
			if (existing === null) {
				await this.app.vault.createFolder(currentPath);
			} else if (existing instanceof TFile) {
				throw new Error(`${currentPath} 是文件，无法创建数据目录。`);
			}
		}
	}

	private updateSyncProgress(progress: SyncProgress): void {
		this.syncProgress = progress;
		this.settingTab?.display();
	}
}
