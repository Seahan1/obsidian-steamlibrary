import type { SteamGame } from './types';

export function getSteamCoverUrl(appid: number): string {
	return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
}

export function getSteamHeaderUrl(appid: number): string {
	return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function getSteamIconUrl(game: SteamGame): string {
	return game.iconHash === undefined
		? ''
		: `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.iconHash}.jpg`;
}

export function getSteamGameNotePath(folder: string, game: SteamGame): string {
	const normalizedFolder = folder.trim().replace(/^\/+|\/+$/g, '');
	const slug = game.name
		.toLowerCase()
		.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return `${normalizedFolder}/${game.appid}-${slug}.md`;
}

export function buildSteamGameNote(game: SteamGame, syncedAt: string): string {
	const achievementsUnlocked = game.achievements?.unlocked ?? 0;
	const achievementsTotal = game.achievements?.total ?? 0;
	const achievementPercent = achievementsTotal === 0 ? 0 : Math.round((achievementsUnlocked / achievementsTotal) * 100);
	const coverUrl = getSteamCoverUrl(game.appid);
	const headerUrl = getSteamHeaderUrl(game.appid);
	const iconUrl = getSteamIconUrl(game);

	return `---
steam_data: true
steam_appid: ${game.appid}
steam_name: ${quoteYamlString(game.name)}
steam_playtime_minutes: ${game.playtimeForever}
steam_playtime_hours: ${Number((game.playtimeForever / 60).toFixed(2))}
steam_playtime_2weeks_minutes: ${game.playtime2Weeks}
steam_achievements_unlocked: ${achievementsUnlocked}
steam_achievements_total: ${achievementsTotal}
steam_achievement_percent: ${achievementPercent}
steam_cover: ${quoteYamlString(coverUrl)}
steam_header: ${quoteYamlString(headerUrl)}
steam_icon: ${quoteYamlString(iconUrl)}
steam_synced_at: ${quoteYamlString(syncedAt)}
cssclasses:
  - steam-game-page
tags:
  - steam/game
---

# ${game.name}

![${game.name} 封面|240](${coverUrl})

- 总游玩时长：${formatPlaytime(game.playtimeForever)}
- 近两周时长：${formatPlaytime(game.playtime2Weeks)}
- 成就：${achievementsUnlocked} / ${achievementsTotal}，${achievementPercent}%
`;
}

function quoteYamlString(value: string): string {
	return JSON.stringify(value);
}

function formatPlaytime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return hours === 0 ? `${remainingMinutes} 分钟` : `${hours} 小时 ${remainingMinutes} 分钟`;
}
