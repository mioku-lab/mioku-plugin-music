# mioku-plugin-music

## 功能

- 点歌搜索：`点歌 晴天`
- 搜索结果截图列表
- 编号听歌：`听1`
- 关键词直听：`听晴天`
- Media User Token：在 WebUI 配置 `base.applemusic.defaultMediaUserToken`
- AI skills：搜索、发送歌曲


## 设计说明

- provider 抽象为统一接口，后续可扩展 QQ 音乐、网易云等来源
