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
      - value: netease
        label: NetEase Cloud Music

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

  - key: base.netease.quality
    label: NetEase 音质
    type: select
    description: 下载音质档位，lossless/hires 需要 VIP cookie
    options:
      - value: standard
        label: 标准 (128k)
      - value: exhigh
        label: 极高 (320k，推荐)
      - value: lossless
        label: 无损 FLAC
      - value: hires
        label: Hi-Res

  - key: base.netease.defaultCookie
    label: NetEase Cookie
    type: secret
    description: 网易云 MUSIC_U cookie，无 cookie 仅能搜索；VIP 音质必须配置
    placeholder: MUSIC_U=...; os=pc; appver=8.9.75;
---

```mioku-fields
keys:
  - base.searchLimit
  - base.defaultProvider
```

### 以下为 Apple Music 的配置区域

```mioku-fields
keys:
  - base.applemusic.storefront
  - base.applemusic.language
  - base.applemusic.defaultMediaUserToken
```

### 以下为网易云音乐的配置区域

```mioku-fields
keys:
   - base.netease.quality
   - base.netease.defaultCookie
```
