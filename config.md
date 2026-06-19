---
title: Music 插件配置
description: 在这里调整 music 插件的配置项目。Token/Cookie、Storefront、语言、音质等请分别在 Apple Music / NetEase 的「服务配置」页面配置。
fields:
  - key: base.searchLimit
    label: 默认搜索条数
    type: number
    description: 点歌时默认拉取的歌曲数量，建议 1-15
    placeholder: 15

  - key: base.defaultProvider
    label: 默认音乐源
    type: select
    description: 初次安装为「无」，需要选择对应的提供商并安装其服务后使用
    options:
      - value: ""
        label: 无（未选择）
      - value: applemusic
        label: Apple Music
      - value: netease
        label: NetEase Cloud Music
---

> 默认音乐源初始为「无」。请先在上方选择提供商，**重启 Bot 后会自动下载对应服务**。

```mioku-fields
keys:
  - base.searchLimit
  - base.defaultProvider
```
