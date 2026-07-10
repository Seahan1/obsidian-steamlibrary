export function shouldRunDailyAutoSync(enabled: boolean, lastAutoSyncDate: string, today: string): boolean {
	return enabled && lastAutoSyncDate !== today;
}
