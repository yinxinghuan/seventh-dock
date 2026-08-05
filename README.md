# Seventh Dock

一款有状态 AI 连续小队冒险。玩家在风暴前的港区调查路线、管理补给与警戒，并与 Mira、Oren、Sai 建立会延续到下一次进入的关系。

## 核心能力

- 单一独立游戏入口，不包含其他 Cartridge 选择器。
- zh/en 完整内容，系统语言首开，玩家回答语言可切换后续界面与回复。
- 独立 UUID、Aigram 云端存档与 localStorage 兜底；远程 chatId 随世界保存。
- 潮位、补给、警戒三项结构化状态，d20 检定、地图、物品与关系事件。
- 当前 AlterU 用户头像作为主角身份，并可用于关键剧情图参考；个人资料不写入 StorySave。
- 关键剧情图片原位进入时间线，不会更新到页面顶部。

## 本地运行

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4181
```

调试头像：`?avatar_url=<public-https-url>&user_name=Alex`。调试语言：`?lang=en` 或 `?lang=zh`。

## 验证

```bash
npm run build
```

需求、视觉与技术说明见 `doc/`。
