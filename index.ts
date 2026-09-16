import { definePlugin } from "mioku";
import { AppleMusicService } from "mioku-service-applemusic";
import { NeteaseService } from "mioku-service-netease";
import { getService, Services } from "mioku";
import { MusicPluginRuntime } from "./runtime-core/service";
import { MUSIC_DEFAULTS } from "./config";
import type { MusicBaseConfig } from "./types";
import { createMusicSkills } from "./skills/music";

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default definePlugin({
  name: "music",
  async setup(ctx) {
    const configService = getService(ctx, Services.Config);
    const aiService = getService(ctx, Services.AI);
    const screenshotService = getService(ctx, Services.Screenshot);
    const applemusicService = getService(ctx, AppleMusicService);
    const neteaseService = getService(ctx, NeteaseService);
    let baseConfig = cloneConfig(MUSIC_DEFAULTS);

    if (configService) {
      await configService.registerConfig("music", "base", baseConfig);
      const nextBase = await configService.getConfig("music", "base");
      if (nextBase) {
        baseConfig = nextBase as MusicBaseConfig;
      }
    } else {
      ctx.logger.warn("config-service 未加载，music 插件将使用默认配置");
    }

    const runtime = new MusicPluginRuntime({
      logger: ctx.logger,
      aiService,
      screenshotService,
      applemusicService,
      neteaseService,
    });
    runtime.updateConfig(baseConfig);

    if (aiService) {
      for (const skill of createMusicSkills(runtime)) aiService.registerSkill(skill);
    }

    const disposers: Array<() => void> = [];
    if (configService) {
      disposers.push(
        configService.onConfigChange("music", "base", (next) => {
          baseConfig = next as MusicBaseConfig;
          runtime.updateConfig(baseConfig);
        }),
      );
    }

    const react = (event: any) => runtime.tryReactToCommandMessage(ctx, event);

    ctx.command({
      name: "点歌",
      match: /^\/?点歌\s*(.+)$/,
      prefixes: false,
      description: "搜索歌曲/歌手/专辑，返回最多 15 条结果图片列表",
      usage: "/点歌 晴天",
      handler: async ({ event, match }) => {
        await react(event);
        await runtime.searchAndSendList(ctx, event, match![1].trim());
      },
    });
    ctx.command({
      name: "听",
      match: /^\/?听\s*(\d{1,2})$/,
      prefixes: false,
      description: "发送上次搜索列表中的指定歌曲语音",
      usage: "听1",
      handler: async ({ event, match }) => {
        await react(event);
        await runtime.sendByIndex(ctx, event, Number(match![1]), false);
      },
    });
    ctx.command({
      name: "原曲",
      match: /^\/?原曲\s*(\d{1,2})$/,
      prefixes: false,
      description: "发送上次搜索列表中的指定歌曲原曲文件",
      usage: "原曲1",
      handler: async ({ event, match }) => {
        await react(event);
        await runtime.sendByIndex(ctx, event, Number(match![1]), true);
      },
    });

    return () => {
      for (const dispose of disposers) dispose();
      if (aiService) aiService.removeSkill("music");
    };
  },
});
