# mioku-plugin-music

`mioku-plugin-music` 是一个可扩展的音乐插件框架实现，当前默认接入 `mioku-service-applemusic`，后续可在 `providers/` 增加更多音乐源。

## 功能

- 点歌搜索：`点歌 晴天`
- 搜索结果截图列表（默认 15 条）
- 编号听歌：`听1`
- 关键词直听：`听晴天`（直接播放搜索第一首）
- 全局默认 Media User Token：在 WebUI 配置 `base.applemusic.defaultMediaUserToken`
- AI skills：搜索、详情查询、发送歌曲
- 指令支持带或不带 `/`，并支持无空格写法（如 `点歌晴天`）
- 下载策略：默认禁止自动降级 30 秒 preview，拿不到 HLS 会直接报错提示检查 token

## 目录结构

```text
plugins/music/
  index.ts
  package.json
  README.md
  help.md
  skills.ts
  runtime.ts
  config.ts
  types.ts
  providers/
    factory.ts
    applemusic-provider.ts
  runtime-core/
    service.ts
    session-store.ts
    message.ts
    fallback.ts
  render/
    search-list.ts
```

## 设计说明

- 插件 `index.ts` 仅做运行时 wiring。
- 复杂逻辑拆分到 `runtime-core/` 和 `providers/`，不堆叠在一个文件。
- provider 抽象为统一接口，后续可扩展 QQ 音乐、网易云等来源。
- 失败路径统一优先通过 `aiService.getChatRuntime().generateNotice(...)`，无 runtime 时文本 fallback。

## 依赖服务

- `ai`
- `screenshot`
- `applemusic`
- `config`（当前预留）
