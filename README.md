# Steam Library

在 Obsidian 中同步 Steam 游戏库、游玩时长与成就，并查看游戏总结仪表盘。

## 功能

- 同步游戏名、总游玩时长、近两周游玩时长。
- 对每款游戏查询已解锁成就与总成就数；Steam 未返回成就资料的游戏不会计入完成率。
- 展示总览、游玩时长 Top 10 条状图与时长区间饼图。
- 为每个游戏生成 Dataview 可查询的 Markdown 数据文件，包含封面、header、icon、时长与成就字段。
- 为每日游玩增量生成热力图数据文件。
- 可在 Obsidian 打开时每天自动同步一次。
- 仅向 Steam Web API 发送 SteamID64 和 API Key；不读取或传输保险库内容，也没有遥测。

## 设置与使用

1. 在 **设置 → Community plugins → Steam Library** 中填入 SteamID64，并在 Secret Storage 中创建或选择 Steam Web API Key。
2. 确保 Steam 个人资料与游戏详情对 API 可见。
3. 设置 Dataview 数据目录，默认是 `Steam Games`。
4. 设置热力图数据目录，默认是 `Steam Activity`。
5. 按需开启 **每天自动同步一次**。
6. 点击设置页里的 **开始同步**，或运行命令 **同步 Steam 游戏库**。
7. 同步完成后，每个游戏会生成一个 Markdown 文件，例如 `Steam Games/440-team-fortress-2.md`；每日活动会生成到 `Steam Activity/2026-07-10.md`。

## Dataview 示例

安装并启用 Dataview 后，在你自己的任意 Markdown 笔记中粘贴：

````markdown
```dataviewjs
const pages = dv
  .pages('"Steam Games"')
  .where((page) => page.steam_data)
  .sort((page) => page.steam_playtime_minutes, 'desc');

const maxMinutes = Math.max(...pages.map((page) => page.steam_playtime_minutes), 1);
const totalGames = pages.length;
const totalMinutes = pages.array().reduce((sum, game) => sum + game.steam_playtime_minutes, 0);
const recentMinutes = pages.array().reduce((sum, game) => sum + game.steam_playtime_2weeks_minutes, 0);

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours === 0 ? `${mins} 分钟` : `${hours} 小时 ${mins} 分钟`;
}

const summary = dv.el('div', '', { cls: 'steam-dataview-summary' });
for (const stat of [
  ['游戏数量', `${totalGames} 款`],
  ['总时长', formatMinutes(totalMinutes)],
  ['近两周时长', formatMinutes(recentMinutes)],
]) {
  const card = summary.createDiv({ cls: 'steam-dataview-summary__card' });
  card.createDiv({ cls: 'steam-dataview-summary__value', text: stat[1] });
  card.createDiv({ cls: 'steam-dataview-summary__label', text: stat[0] });
}

const activityPages = dv
  .pages('"Steam Activity"')
  .where((page) => page.steam_activity)
  .array();
const activityByDate = new Map(activityPages.map((page) => [String(page.steam_date), page.steam_playtime_minutes ?? 0]));
const heatmap = dv.el('div', '', { cls: 'steam-heatmap' });
heatmap.createDiv({ cls: 'steam-heatmap__title', text: '每日游玩强度' });
const heatmapGrid = heatmap.createDiv({ cls: 'steam-heatmap__grid' });
const today = new Date();
const start = new Date(today);
start.setDate(today.getDate() - 370);

for (let index = 0; index <= 370; index += 1) {
  const date = new Date(start);
  date.setDate(start.getDate() + index);
  const key = date.toISOString().slice(0, 10);
  const minutes = activityByDate.get(key) ?? 0;
  const level = minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 120 ? 2 : minutes < 300 ? 3 : 4;
  heatmapGrid.createDiv({
    cls: `steam-heatmap__day steam-heatmap__day--${level}`,
    attr: { title: `${key}: ${formatMinutes(minutes)}` },
  });
}
const legend = heatmap.createDiv({ cls: 'steam-heatmap__legend' });
legend.createSpan({ text: '少' });
for (const level of [0, 1, 2, 3, 4]) {
  legend.createSpan({ cls: `steam-heatmap__day steam-heatmap__day--${level}` });
}
legend.createSpan({ text: '多' });

const grid = dv.el('div', '', { cls: 'steam-dataview-grid' });

for (const game of pages) {
  const card = grid.createEl('a', {
    cls: 'steam-dataview-card',
    attr: { href: game.file.path },
  });
  card.createEl('img', {
    cls: 'steam-dataview-card__cover',
    attr: { src: game.steam_cover, alt: `${game.steam_name} 封面` },
  });
  const body = card.createDiv({ cls: 'steam-dataview-card__body' });
  body.createDiv({ cls: 'steam-dataview-card__title', text: game.steam_name });
  body.createDiv({ cls: 'steam-dataview-card__meta', text: `${game.steam_playtime_hours} 小时 · 成就 ${game.steam_achievement_percent}%` });
  const bar = body.createDiv({ cls: 'steam-dataview-card__bar' });
  bar.createDiv({
    cls: 'steam-dataview-card__bar-fill',
    attr: { style: `width: ${(game.steam_playtime_minutes / maxMinutes) * 100}%` },
  });
}
```
````

如果你把数据目录改成了别的路径，把 `dv.pages('"Steam Games"')` 里的 `Steam Games` 改成你的目录名。

每个游戏文件提供这些 Dataview 字段：

```yaml
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
steam_icon: "https://media.steampowered.com/steamcommunity/public/images/apps/440/..."
steam_synced_at: "2026-07-10T00:00:00.000Z"
```

## 开发

```bash
npm ci
npm test
npm run lint
npm run build
```

将 `main.js`、`manifest.json` 和 `styles.css` 复制到 `<vault>/.obsidian/plugins/steam-library/` 后，在 Obsidian 的社区插件设置中启用。

## 数据来源

- [Steam IPlayerService / GetOwnedGames](https://partner.steamgames.com/doc/webapi/iplayerservice?language=english)
- [Steam ISteamUserStats / GetPlayerAchievements](https://partner.steamgames.com/doc/webapi/ISteamUserStats)
- [Obsidian Secret Storage](https://docs.obsidian.md/plugins/guides/secret-storage)
