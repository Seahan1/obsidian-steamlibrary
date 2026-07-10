import type { SteamGame } from './types';

export interface DailySteamActivity {
	date: string;
	playtimeMinutes: number;
	gamesPlayed: number;
	syncedAt: string;
}

export function calculateDailyActivity(
	previousGames: SteamGame[] | undefined,
	currentGames: SteamGame[],
	date: string,
	syncedAt: string,
): DailySteamActivity {
	const previousPlaytime = new Map(previousGames?.map((game) => [game.appid, game.playtimeForever]) ?? []);
	let playtimeMinutes = 0;
	let gamesPlayed = 0;

	for (const game of currentGames) {
		const previousMinutes = previousGames === undefined ? game.playtimeForever : previousPlaytime.get(game.appid) ?? 0;
		const delta = game.playtimeForever - previousMinutes;
		if (delta > 0) {
			playtimeMinutes += delta;
			gamesPlayed += 1;
		}
	}

	return { date, playtimeMinutes, gamesPlayed, syncedAt };
}

export function mergeDailyActivity(existing: DailySteamActivity | undefined, incoming: DailySteamActivity): DailySteamActivity {
	if (existing === undefined || existing.date !== incoming.date) {
		return incoming;
	}

	return {
		date: incoming.date,
		playtimeMinutes: existing.playtimeMinutes + incoming.playtimeMinutes,
		gamesPlayed: existing.gamesPlayed + incoming.gamesPlayed,
		syncedAt: incoming.syncedAt,
	};
}

export function getSteamActivityNotePath(folder: string, activity: DailySteamActivity): string {
	const normalizedFolder = folder.trim().replace(/^\/+|\/+$/g, '');
	return `${normalizedFolder}/${activity.date}.md`;
}

export function buildSteamActivityNote(activity: DailySteamActivity): string {
	return `---
steam_activity: true
steam_date: ${quoteYamlString(activity.date)}
steam_playtime_minutes: ${activity.playtimeMinutes}
steam_playtime_hours: ${Number((activity.playtimeMinutes / 60).toFixed(2))}
steam_games_played: ${activity.gamesPlayed}
steam_synced_at: ${quoteYamlString(activity.syncedAt)}
tags:
  - steam/activity
---

# Steam Activity ${activity.date}

- 当日游玩增量：${formatPlaytime(activity.playtimeMinutes)}
- 有增量的游戏：${activity.gamesPlayed} 款
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
