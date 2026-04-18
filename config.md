---
title: Music 插件配置
description: 在这里调整 music 插件的配置项目
fields:
  - key: base.searchLimit
    label: 默认搜索条数
    type: number
    description: 点歌时默认拉取的歌曲数量，建议 1-15
    placeholder: 15

  - key: base.defaultProvider
    label: 默认音乐源
    type: select
    description: 需要安装对应的服务
    options:
      - value: applemusic
        label: Apple Music

  - key: base.applemusic.storefront
    label: Apple Music Storefront
    type: text
    description: 默认地区代码，例如 cn、us、jp。
    placeholder: cn

  - key: base.applemusic.language
    label: Apple Music 语言
    type: text
    description: 默认语言代码，例如 zh-CN、en-US。
    placeholder: zh-CN

  - key: base.applemusic.defaultMediaUserToken
    label: 默认 Media User Token
    type: secret
    description: Apple Music 下载高质量 AAC 必需 token，无token仅能下载30s音频
    placeholder: eyJ...
---

```mioku-fields
keys:
  - base.searchLimit
  - base.defaultProvider
```

```mioku-fields
keys:
  - base.applemusic.storefront
  - base.applemusic.language
  - base.applemusic.defaultMediaUserToken
```
