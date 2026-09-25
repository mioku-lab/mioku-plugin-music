import { definePlugin } from "mioku";
import { getService, Services } from "mioku";
import type { MessageEvent } from "mioku";
import type { AppleMusicServiceApi } from "mioku-service-applemusic";
import type { NeteaseServiceApi } from "mioku-service-netease";
import type { NcmdumpServiceApi } from "mioku-service-ncmdump";
import { MusicPluginRuntime } from "./runtime-core/service";
import { MUSIC_DEFAULTS } from "./config";
import type { MusicBaseConfig } from "./types";
import { createMusicSkills } from "./skills/music";
import { importOptionalService } from "./runtime-core/optional-service";
import { installMissingOptionalServices } from "./runtime-core/auto-install";
import { DumpFlow } from "./runtime-core/dump-flow";
import { dumpProviderExtensions } from "./dumps/factory";
import { extractIncomingFiles } from "./dumps/file-source";

function cloneConfig<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeWithDefaults(next: unknown): MusicBaseConfig {
  return { ...cloneConfig(MUSIC_DEFAULTS), ...(next as MusicBaseConfig) };
}

type PrivateMessageRoute =
  | "onebotv11:message.private"
  | "icqq:message.private"
  | "qq-official:message.private";

const PRIVATE_MESSAGE_ROUTES: readonly PrivateMessageRoute[] = [
  "onebotv11:message.private",
  "icqq:message.private",
  "qq-official:message.private",
];

export default definePlugin({
  name: "music",
  async setup(ctx) {
    const configService = getService(ctx, Services.Config);
    const aiService = getService(ctx, Services.AI);
    const screenshotService = getService(ctx, Services.Screenshot);
    const [applemusicRef, neteaseRef, ncmdumpRef] = await Promise.all([
      importOptionalService<AppleMusicServiceApi>(
        "mioku-service-applemusic",
        "AppleMusicService",
      ),
      importOptionalService<NeteaseServiceApi>("mioku-service-netease", "NeteaseService"),
      importOptionalService<NcmdumpServiceApi>("mioku-service-ncmdump", "NcmdumpService"),
    ]);
    const applemusicService = applemusicRef ? getService(ctx, applemusicRef) : undefined;
    const neteaseService = neteaseRef ? getService(ctx, neteaseRef) : undefined;
    const ncmdumpService = ncmdumpRef ? getService(ctx, ncmdumpRef) : undefined;
    let baseConfig = cloneConfig(MUSIC_DEFAULTS);

    if (configService) {
      await configService.registerConfig("music", "base", baseConfig);
      const nextBase = await configService.getConfig("music", "base");
      if (nextBase) {
        baseConfig = mergeWithDefaults(nextBase);
      }
    } else {
      ctx.logger.warn("config-service 未加载，music 插件将使用默认配置");
    }

    installMissingOptionalServices(ctx.logger, baseConfig);

    const runtime = new MusicPluginRuntime({
      logger: ctx.logger,
      aiService,
      screenshotService,
      applemusicService,
      neteaseService,
      ncmdumpService,
    });
    runtime.updateConfig(baseConfig);

    if (aiService) {
      for (const skill of createMusicSkills(runtime)) aiService.registerSkill(skill);
    }

    const disposers: Array<() => void> = [];
    if (configService) {
      disposers.push(
        configService.onConfigChange("music", "base", (next) => {
          baseConfig = mergeWithDefaults(next);
          runtime.updateConfig(baseConfig);
          installMissingOptionalServices(ctx.logger, baseConfig);
        }),
      );
    }

    const dumpFlow = new DumpFlow({ logger: ctx.logger });
    disposers.push(
      ctx.handle(PRIVATE_MESSAGE_ROUTES, (event) => {
        const provider = runtime.resolveDumpProvider();
        if (!provider) return;
        const files = extractIncomingFiles(
          event,
          dumpProviderExtensions(provider.name),
          ctx.logger,
        );
        for (const file of files) dumpFlow.enqueue(ctx, event, provider, file);
      }),
    );

    const react = (event: MessageEvent) => runtime.tryReactToCommandMessage(ctx, event);

    ctx.command({
      prefixes: false,
      name: "点歌",
      match: /^点歌\s*(.+)$/,
      description: "搜索歌曲/歌手/专辑，返回最多 15 条结果图片列表",
      usage: ".点歌 晴天",
      handler: async ({ event, match }) => {
        await react(event);
        await runtime.searchAndSendList(ctx, event, match![1].trim());
      },
    });
    ctx.command({
      prefixes: false,
      name: "听",
      match: /^听\s*(\d{1,2})$/,
      description: "发送上次搜索列表中的指定歌曲语音",
      usage: ".听1",
      handler: async ({ event, match }) => {
        await react(event);
        await runtime.sendByIndex(ctx, event, Number(match![1]), false);
      },
    });
    ctx.command({
      prefixes: false,
      name: "原曲",
      match: /^原曲\s*(\d{1,2})$/,
      description: "发送上次搜索列表中的指定歌曲原曲文件",
      usage: ".原曲1",
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
