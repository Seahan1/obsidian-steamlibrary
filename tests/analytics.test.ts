import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDashboardSummary } from '../src/analytics.ts';
import { buildSteamActivityNote, calculateDailyActivity, getSteamActivityNotePath, mergeDailyActivity } from '../src/activity-note.ts';
import { shouldRunDailyAutoSync } from '../src/auto-sync.ts';
import { buildSteamGameNote, getSteamGameNotePath } from '../src/game-note.ts';
import { getSyncProgressLabel, getSyncProgressPercent } from '../src/sync-progress.ts';

test('buildDashboardSummary calculates totals, sorted games and playtime buckets', () => {
	const summary = buildDashboardSummary([
		{ appid: 1, name: 'Alpha', playtimeForever: 30, playtime2Weeks: 0, achievements: { unlocked: 1, total: 2 } },
		{ appid: 2, name: 'Bravo', playtimeForever: 650, playtime2Weeks: 20, achievements: { unlocked: 3, total: 4 } },
		{ appid: 3, name: 'Charlie', playtimeForever: 3_200, playtime2Weeks: 0 },
	]);

	assert.equal(summary.totalGames, 3);
	assert.equal(summary.totalPlaytimeMinutes, 3_880);
	assert.equal(summary.totalPlaytime2WeeksMinutes, 20);
	assert.deepEqual(summary.topGames.map((game) => game.name), ['Charlie', 'Bravo', 'Alpha']);
	assert.deepEqual(summary.playtimeBuckets.map((bucket) => bucket.gameCount), [0, 1, 1, 1]);
	assert.deepEqual(summary.achievements, { unlocked: 4, total: 6, completionPercent: 67 });
});

test('sync progress helpers describe idle and running states', () => {
	assert.equal(getSyncProgressPercent({ phase: 'idle', completed: 0, total: 0 }), 0);
	assert.equal(getSyncProgressLabel({ phase: 'idle', completed: 0, total: 0 }), '尚未开始同步');
	assert.equal(getSyncProgressPercent({ phase: 'achievements', completed: 3, total: 12 }), 25);
	assert.equal(getSyncProgressLabel({ phase: 'achievements', completed: 3, total: 12 }), '正在同步成就：3 / 12');
	assert.equal(getSyncProgressLabel({ phase: 'writing-notes', completed: 7, total: 12 }), '正在写入 Markdown：7 / 12');
	assert.equal(getSyncProgressPercent({ phase: 'completed', completed: 12, total: 12 }), 100);
});

test('game notes expose dataview frontmatter and Steam artwork URLs', () => {
	const game = {
		appid: 440,
		name: 'Team Fortress 2',
		playtimeForever: 125,
		playtime2Weeks: 30,
		iconHash: 'abc123',
		achievements: { unlocked: 5, total: 10 },
	};

	assert.equal(getSteamGameNotePath('Steam Games', game), 'Steam Games/440-team-fortress-2.md');
	assert.equal(buildSteamGameNote(game, '2026-07-10T00:00:00.000Z'), `---
steam_data: true
steam_appid: 440
steam_name: "Team Fortress 2"
steam_playtime_minutes: 125
steam_playtime_hours: 2.08
steam_playtime_2weeks_minutes: 30
steam_achievements_unlocked: 5
steam_achievements_total: 10
steam_achievement_percent: 50
steam_cover: "https://cdn.cloudflare.steamstatic.com/steam/apps/440/library_600x900.jpg"
steam_header: "https://cdn.cloudflare.steamstatic.com/steam/apps/440/header.jpg"
steam_icon: "https://media.steampowered.com/steamcommunity/public/images/apps/440/abc123.jpg"
steam_synced_at: "2026-07-10T00:00:00.000Z"
cssclasses:
  - steam-game-page
tags:
  - steam/game
---

# Team Fortress 2

![Team Fortress 2 封面|240](https://cdn.cloudflare.steamstatic.com/steam/apps/440/library_600x900.jpg)

- 总游玩时长：2 小时 5 分钟
- 近两周时长：30 分钟
- 成就：5 / 10，50%
`);
});

test('daily activity uses positive playtime deltas and creates dataview notes', () => {
	const previousGames = [
		{ appid: 1, name: 'Alpha', playtimeForever: 60, playtime2Weeks: 0 },
		{ appid: 2, name: 'Bravo', playtimeForever: 120, playtime2Weeks: 0 },
	];
	const currentGames = [
		{ appid: 1, name: 'Alpha', playtimeForever: 90, playtime2Weeks: 30 },
		{ appid: 2, name: 'Bravo', playtimeForever: 120, playtime2Weeks: 0 },
		{ appid: 3, name: 'Charlie', playtimeForever: 15, playtime2Weeks: 15 },
	];
	const activity = calculateDailyActivity(previousGames, currentGames, '2026-07-10', '2026-07-10T08:00:00.000Z');
	const merged = mergeDailyActivity({ ...activity, playtimeMinutes: 45, gamesPlayed: 2 }, activity);

	assert.deepEqual(activity, {
		date: '2026-07-10',
		playtimeMinutes: 45,
		gamesPlayed: 2,
		syncedAt: '2026-07-10T08:00:00.000Z',
	});
	assert.deepEqual(merged, {
		date: '2026-07-10',
		playtimeMinutes: 90,
		gamesPlayed: 4,
		syncedAt: '2026-07-10T08:00:00.000Z',
	});
	assert.equal(getSteamActivityNotePath('Steam Activity', activity), 'Steam Activity/2026-07-10.md');
	assert.equal(buildSteamActivityNote(activity), `---
steam_activity: true
steam_date: "2026-07-10"
steam_playtime_minutes: 45
steam_playtime_hours: 0.75
steam_games_played: 2
steam_synced_at: "2026-07-10T08:00:00.000Z"
tags:
  - steam/activity
---

# Steam Activity 2026-07-10

- 当日游玩增量：45 分钟
- 有增量的游戏：2 款
`);
});

test('daily auto sync runs once per day only when enabled', () => {
	assert.equal(shouldRunDailyAutoSync(false, '', '2026-07-10'), false);
	assert.equal(shouldRunDailyAutoSync(true, '2026-07-10', '2026-07-10'), false);
	assert.equal(shouldRunDailyAutoSync(true, '2026-07-09', '2026-07-10'), true);
});
