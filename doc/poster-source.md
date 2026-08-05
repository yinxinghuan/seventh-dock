# 海报来源记录

- 制作日期：2026-08-05
- 制作接口：`POST https://chat.aiwaves.tech/aigram/api/gen-image`
- 请求 Origin：`https://aigram.app`
- 初版中文源（已废弃）：`https://cdn.aiwaves.tech/prod/telegram/avatar/0/1785929329684981.webp`
- 双语候选（因含中文被拒绝）：`https://cdn.aiwaves.tech/prod/telegram/avatar/0/1785933853889839.webp`
- 最终英文-only 生成源：`https://cdn.aiwaves.tech/prod/telegram/avatar/0/1785934771563938.webp`
- 本地发布文件：`public/poster.png`，1024×1024 PNG
- 制作过程：第一轮生成港城、三位旅行者、路线图与灯笼的叙事场景。曾错误制作双语候选；按平台英文-only 门禁将其拦截。最终以双语候选作 `ref_url`，彻底移除中文并重建风暴天空，只保留上方安全区内一行准确英文标题 `SEVENTH DOCK`。
- 语言检查：1024×1024 原图只有英文 `SEVENTH DOCK`，无中文、伪中文字符、Logo 或 UI。
- 缩略图验证：160×160 下英文标题、三人、路线图与灯笼仍可辨认，底部没有平台按钮会遮挡的关键信息。

## Cartridge 世界母图

- 《第七码头》最终源：`https://cdn.aiwaves.tech/prod/telegram/avatar/0/1785932246363151.webp`，本地 `src/story/img/worlds/seventh-dock.webp`。
- 《屋顶公寓》最终源：`https://cdn.aiwaves.tech/prod/telegram/avatar/0/1785932206289958.webp`，本地 `src/story/img/worlds/rooftop-apartment.webp`。
- 两图均由同一 Aigram transit 接口制作，1024×1024 WebP，无 Logo、无 UI；入口采用 3:2 宽裁切，未出图消息采用 4:3 裁切、灰阶与扫描线处理。
- 公寓图第二轮将开放账本改成无字封面的合拢账本；港口图第二轮清空海图伪文字并把表盘改为抽象潮位刻度。港口图仍保留不可读的装饰刻度，不承担数值或文字信息。
