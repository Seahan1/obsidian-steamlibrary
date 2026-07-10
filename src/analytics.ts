import type { DashboardSummary, SteamGame } from './types';

const PLAYTIME_BUCKETS = [
	{ label: '未游玩', minimumMinutes: -1, maximumMinutes: 0 },
	{ label: '1–10 小时', minimumMinutes: 0, maximumMinutes: 600 },
	{ label: '10–50 小时', minimumMinutes: 600, maximumMinutes: 3_000 },
	{ label: '50+ 小时', minimumMinutes: 3_000, maximumMinutes: Number.POSITIVE_INFINITY },
];

export function buildDashboardSummary(games: SteamGame[]): DashboardSummary {
	const totalPlaytimeMinutes = games.reduce((total, game) => total + game.playtimeForever, 0);
	const totalPlaytime2WeeksMinutes = games.reduce((total, game) => total + game.playtime2Weeks, 0);
	const unlocked = games.reduce((total, game) => total + (game.achievements?.unlocked ?? 0), 0);
	const achievementsTotal = games.reduce((total, game) => total + (game.achievements?.total ?? 0), 0);

	return {
		totalGames: games.length,
		totalPlaytimeMinutes,
		totalPlaytime2WeeksMinutes,
		topGames: [...games]
			.sort((left, right) => right.playtimeForever - left.playtimeForever)
			.slice(0, 10),
		playtimeBuckets: PLAYTIME_BUCKETS.map((bucket) => ({
			label: bucket.label,
			gameCount: games.filter((game) => {
				return game.playtimeForever > bucket.minimumMinutes && game.playtimeForever <= bucket.maximumMinutes;
			}).length,
		})),
		achievements: {
			unlocked,
			total: achievementsTotal,
			completionPercent: achievementsTotal === 0 ? 0 : Math.round((unlocked / achievementsTotal) * 100),
		},
	};
}

export function formatPlaytime(minutes: number): string {
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return hours === 0 ? `${remainingMinutes} 分钟` : `${hours} 小时 ${remainingMinutes} 分钟`;
}
