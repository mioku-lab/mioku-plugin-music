import { definePlugin } from "mioki";
import type { AIService } from "mioku";
import type { ScreenshotService } from "mioku";
import type { ConfigService } from "mioku";
import type { AppleMusicServiceApi } from "mioku-service-applemusic";
import type { NeteaseServiceApi } from "mioku-service-netease";
import { resetMusicRuntimeState, setMusicRuntimeState } from "./runtime";
import { MusicPluginRuntime } from "./runtime-core/service";
import { MUSIC_DEFAULTS } from "./config";
import type { MusicBaseConfig } from "./types";

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default definePlugin({
  name: "music",
  version: "1.0.0",
  description: "点歌与听歌插件",
  async setup(ctx) {
    const configService = ctx.services?.config as ConfigService | undefined;
    const aiService = ctx.services?.ai as AIService | undefined;
    const screenshotService = ctx.services?.screenshot as
      | ScreenshotService
      | undefined;
    const applemusicService = ctx.services?.applemusic as
      | AppleMusicServiceApi
      | undefined;
    const neteaseService = ctx.services?.netease as
      | NeteaseServiceApi
      | undefined;
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

    setMusicRuntimeState({ runtime });

    const disposers: Array<() => void> = [];
    if (configService) {
      disposers.push(
        configService.onConfigChange("music", "base", (next) => {
          baseConfig = next as MusicBaseConfig;
          runtime.updateConfig(baseConfig);
        }),
      );
    }

    ctx.handle("message", async (event: any) => {
      await runtime.handleMessage(ctx, event);
    });

    return () => {
      for (const dispose of disposers) {
        dispose();
      }
      resetMusicRuntimeState();
    };
  },
});
