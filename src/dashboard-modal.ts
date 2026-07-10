import { App, Modal } from 'obsidian';

import { buildDashboardSummary, formatPlaytime } from './analytics';
import type { SteamLibrarySnapshot } from './types';

export class SteamDashboardModal extends Modal {
	constructor(app: App, private readonly snapshot: SteamLibrarySnapshot) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		const summary = buildDashboardSummary(this.snapshot.games);
		contentEl.addClass('steam-dashboard');
		contentEl.createEl('h2', { text: 'Steam 游戏总结' });
		contentEl.createEl('p', { cls: 'steam-dashboard__updated', text: `同步于 ${new Date(this.snapshot.syncedAt).toLocaleString()}` });

		const stats = contentEl.createDiv({ cls: 'steam-dashboard__stats' });
		this.createStat(stats, '游戏数量', String(summary.totalGames));
		this.createStat(stats, '总游玩时长', formatPlaytime(summary.totalPlaytimeMinutes));
		this.createStat(stats, '近两周时长', formatPlaytime(summary.totalPlaytime2WeeksMinutes));
		this.createStat(stats, '成就完成率', `${summary.achievements.completionPercent}%`);

		contentEl.createEl('h3', { text: '游玩时长 Top 10' });
		const maximumMinutes = summary.topGames[0]?.playtimeForever ?? 1;
		const bars = contentEl.createDiv({ cls: 'steam-dashboard__bars' });
		for (const game of summary.topGames) {
			const row = bars.createDiv({ cls: 'steam-dashboard__bar-row' });
			row.createDiv({ cls: 'steam-dashboard__bar-name', text: game.name });
			const track = row.createDiv({ cls: 'steam-dashboard__bar-track' });
			track.createDiv({ cls: 'steam-dashboard__bar-fill', attr: { style: `width: ${(game.playtimeForever / maximumMinutes) * 100}%` } });
			row.createDiv({ cls: 'steam-dashboard__bar-value', text: formatPlaytime(game.playtimeForever) });
		}

		contentEl.createEl('h3', { text: '游戏时长分布' });
		const totalGames = Math.max(summary.totalGames, 1);
		let accumulatedPercent = 0;
		const stops = summary.playtimeBuckets.map((bucket, index) => {
			const start = accumulatedPercent;
			accumulatedPercent += (bucket.gameCount / totalGames) * 100;
			return `var(--steam-chart-${index}) ${start}% ${accumulatedPercent}%`;
		});
		const distribution = contentEl.createDiv({ cls: 'steam-dashboard__distribution' });
		distribution.createDiv({ cls: 'steam-dashboard__pie', attr: { style: `background: conic-gradient(${stops.join(', ')})` } });
		const legend = distribution.createDiv({ cls: 'steam-dashboard__legend' });
		for (const [index, bucket] of summary.playtimeBuckets.entries()) {
			const item = legend.createDiv({ cls: 'steam-dashboard__legend-item' });
			item.createSpan({ cls: `steam-dashboard__legend-swatch steam-dashboard__legend-swatch--${index}` });
			item.createSpan({ text: `${bucket.label}：${bucket.gameCount} 款` });
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private createStat(container: HTMLElement, label: string, value: string): void {
		const card = container.createDiv({ cls: 'steam-dashboard__stat' });
		card.createDiv({ cls: 'steam-dashboard__stat-value', text: value });
		card.createDiv({ cls: 'steam-dashboard__stat-label', text: label });
	}
}
