export interface AchievementProgress {
	unlocked: number;
	total: number;
}

export interface SteamGame {
	appid: number;
	name: string;
	playtimeForever: number;
	playtime2Weeks: number;
	iconHash?: string;
	achievements?: AchievementProgress;
}

export interface PlaytimeBucket {
	label: string;
	gameCount: number;
}

export interface DashboardSummary {
	totalGames: number;
	totalPlaytimeMinutes: number;
	totalPlaytime2WeeksMinutes: number;
	topGames: SteamGame[];
	playtimeBuckets: PlaytimeBucket[];
	achievements: AchievementProgress & { completionPercent: number };
}

export interface SteamLibrarySnapshot {
	syncedAt: string;
	games: SteamGame[];
}
