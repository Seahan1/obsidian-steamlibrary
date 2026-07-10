import { requestUrl } from 'obsidian';

import type { SteamGame } from './types';

interface OwnedGamesResponse {
	response?: {
		games?: Array<{
			appid: number;
			name: string;
			img_icon_url?: string;
			playtime_forever: number;
			playtime_2weeks?: number;
		}>;
	};
}

interface PlayerAchievementsResponse {
	playerstats?: {
		success: boolean;
		achievements?: Array<{ achieved: number }>;
	};
}

const STEAM_API_BASE = 'https://api.steampowered.com';

export class SteamApiClient {
	constructor(
		private readonly apiKey: string,
		private readonly steamId: string,
	) {}

	async getOwnedGames(): Promise<SteamGame[]> {
		const url = this.createUrl('/IPlayerService/GetOwnedGames/v0001/', {
			include_appinfo: 'true',
			include_played_free_games: 'true',
		});
		const response = await requestUrl({ url });
		const payload = response.json as OwnedGamesResponse;

		return (payload.response?.games ?? []).map((game) => ({
			appid: game.appid,
			name: game.name,
			...(game.img_icon_url === undefined || game.img_icon_url.length === 0 ? {} : { iconHash: game.img_icon_url }),
			playtimeForever: game.playtime_forever,
			playtime2Weeks: game.playtime_2weeks ?? 0,
		}));
	}

	async getAchievementProgress(appid: number): Promise<{ unlocked: number; total: number } | undefined> {
		const url = this.createUrl('/ISteamUserStats/GetPlayerAchievements/v0001/', { appid: String(appid) });
		try {
			const response = await requestUrl({ url, throw: false });
			if (response.status !== 200) {
				return undefined;
			}
			const payload = response.json as PlayerAchievementsResponse;
			const achievements = payload.playerstats?.achievements;
			if (!payload.playerstats?.success || achievements === undefined) {
				return undefined;
			}
			return {
				unlocked: achievements.filter((achievement) => achievement.achieved === 1).length,
				total: achievements.length,
			};
		} catch {
			return undefined;
		}
	}

	private createUrl(path: string, parameters: Record<string, string>): string {
		const query = new URLSearchParams({ key: this.apiKey, steamid: this.steamId, ...parameters });
		return `${STEAM_API_BASE}${path}?${query.toString()}`;
	}
}
