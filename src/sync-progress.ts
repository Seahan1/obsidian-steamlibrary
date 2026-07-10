export type SyncPhase = 'idle' | 'loading-games' | 'achievements' | 'writing-notes' | 'completed' | 'failed';

export interface SyncProgress {
	phase: SyncPhase;
	completed: number;
	total: number;
}

export function createIdleSyncProgress(): SyncProgress {
	return { phase: 'idle', completed: 0, total: 0 };
}

export function getSyncProgressPercent(progress: SyncProgress): number {
	if (progress.phase === 'completed') {
		return 100;
	}
	if (progress.total === 0) {
		return 0;
	}
	return Math.round((progress.completed / progress.total) * 100);
}

export function getSyncProgressLabel(progress: SyncProgress): string {
	if (progress.phase === 'loading-games') {
		return '正在读取游戏库';
	}
	if (progress.phase === 'achievements') {
		return `正在同步成就：${progress.completed} / ${progress.total}`;
	}
	if (progress.phase === 'writing-notes') {
		return `正在写入 Markdown：${progress.completed} / ${progress.total}`;
	}
	if (progress.phase === 'completed') {
		return `同步完成：${progress.total} 款游戏`;
	}
	if (progress.phase === 'failed') {
		return '同步失败。请检查 SteamID64、API Key 与个人资料可见性。';
	}
	return '尚未开始同步';
}

export function isSyncRunning(progress: SyncProgress): boolean {
	return progress.phase === 'loading-games' || progress.phase === 'achievements' || progress.phase === 'writing-notes';
}
