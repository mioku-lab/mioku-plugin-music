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
  version: "1.0.0",
  description: "点歌与听歌插件",
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

    ctx.handle("message", async (event) => {
      await runtime.handleMessage(ctx, event);
    });

    return () => {
      for (const dispose of disposers) dispose();
      if (aiService) aiService.removeSkill("music");
    };
  },
});
