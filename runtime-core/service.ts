import type { AIService } from "../../../src/services/ai/types";
import type { ScreenshotService } from "../../../src/services/screenshot/types";
import type { AppleMusicServiceApi } from "../../../src/services/applemusic/types";
import { MUSIC_DEFAULTS } from "../config";
import { createMusicProvider } from "../providers/factory";
import { renderMusicSearchListHtml } from "../render/search-list";
import { MusicSessionStore } from "./session-store";
import { notifyFallback } from "./fallback";
import {
  sendImageMessage,
  sendRecordMessage,
  sendTextMessage,
} from "./message";
import type {
  MusicBaseConfig,
  MusicProviderName,
  MusicSearchResult,
  MusicSessionState,
} from "../types";

interface MusicPluginRuntimeDeps {
  logger: { info: (msg: string) => void; warn: (msg: string) => void };
  aiService?: AIService;
  screenshotService?: ScreenshotService;
  applemusicService?: AppleMusicServiceApi;
}

function parseListenIndex(text: string): number | null {
  const match = text.match(/^\/?听\s*(\d{1,2})$/);
  if (!match) {
    return null;
  }
  const idx = Number(match[1]);
  if (!Number.isFinite(idx) || idx <= 0) {
    return null;
  }
  return idx;
}

function parseSearchKeyword(text: string): string | null {
  const match = text.match(/^\/?点歌\s*(.+)$/);
  if (!match) {
    return null;
  }
  const value = String(match[1] || "").trim();
  return value ? value : null;
}

function parseListenKeyword(text: string): string | null {
  const match = text.match(/^\/?听\s*(.+)$/);
  if (!match) {
    return null;
  }
  const value = String(match[1] || "").trim();
  if (!value || /^\d+$/.test(value)) {
    return null;
  }
  return value;
}

export class MusicPluginRuntime {
  private readonly deps: MusicPluginRuntimeDeps;
  private readonly sessions = new MusicSessionStore();
  private config: MusicBaseConfig = MUSIC_DEFAULTS;

  constructor(deps: MusicPluginRuntimeDeps) {
    this.deps = deps;
  }

  updateConfig(nextConfig: MusicBaseConfig): void {
    this.config = nextConfig;
  }

  setSessionMediaUserToken(event: any, token: string): void {
    const trimmed = String(token || "").trim();
    if (!trimmed) {
      return;
    }
    const session = this.getOrCreateSession(event);
    this.sessions.patch(event, {
      provider: session.provider,
      mediaUserToken: trimmed,
    });
  }

  getSession(event: any): MusicSessionState | undefined {
    return this.sessions.get(event);
  }

  async handleMessage(ctx: any, event: any): Promise<boolean> {
    const text = String(ctx.text(event) || "").trim();
    if (!text) {
      return false;
    }

    const searchKeyword = parseSearchKeyword(text);
    if (searchKeyword) {
      await this.searchAndSendList(ctx, event, searchKeyword);
      return true;
    }

    const listenIndex = parseListenIndex(text);
    if (listenIndex != null) {
      await this.sendByIndex(ctx, event, listenIndex);
      return true;
    }

    const listenKeyword = parseListenKeyword(text);
    if (listenKeyword) {
      await this.sendByKeyword(ctx, event, listenKeyword);
      return true;
    }

    return false;
  }

  async searchSongs(event: any, query: string): Promise<MusicSearchResult> {
    const session = this.getOrCreateSession(event);
    const provider = this.createProvider(
      session.provider,
      session.mediaUserToken,
    );
    const result = await provider.searchSongs(query, this.config.searchLimit);
    this.sessions.patch(event, {
      lastSearch: result,
      provider: session.provider,
      mediaUserToken: session.mediaUserToken,
    });
    return result;
  }

  async getSongDetail(event: any, songId: string) {
    const session = this.getOrCreateSession(event);
    const provider = this.createProvider(
      session.provider,
      session.mediaUserToken,
    );
    return provider.getSongDetail(songId);
  }

  async getAlbumDetail(event: any, albumId: string) {
    const session = this.getOrCreateSession(event);
    const provider = this.createProvider(
      session.provider,
      session.mediaUserToken,
    );
    return provider.getAlbumDetail(albumId);
  }

  async sendSongById(ctx: any, event: any, songId: string): Promise<void> {
    const session = this.getOrCreateSession(event);
    const provider = this.createProvider(
      session.provider,
      session.mediaUserToken,
    );
    const result = await provider.downloadSong(songId);
    this.deps.logger.info(
      `[music] download songId=${songId} source=${result.sourceType} file=${result.filePath}`,
    );
    if (result.sourceType !== "hls") {
      throw new Error("当前未获取到高质量 HLS 音频，请检查 media user token");
    }
    await sendRecordMessage(ctx, event, result.filePath);
  }

  async notifyFailure(
    ctx: any,
    event: any,
    instruction: string,
    fallbackMessage: string,
  ): Promise<void> {
    await notifyFallback({
      ctx,
      event,
      aiService: this.deps.aiService,
      instruction,
      fallbackMessage,
    });
  }

  async sendSongByQuery(ctx: any, event: any, query: string): Promise<void> {
    const result = await this.searchSongs(event, query);
    const first = result.tracks[0];
    if (!first) {
      await notifyFallback({
        ctx,
        event,
        aiService: this.deps.aiService,
        instruction: `用户说“听${query}”，但搜索不到可播放歌曲。请简短提示换关键词。`,
        fallbackMessage: `没有找到和「${query}」相关的歌曲`,
      });
      return;
    }

    await this.sendSongById(ctx, event, first.id);
  }

  private async searchAndSendList(
    ctx: any,
    event: any,
    keyword: string,
  ): Promise<void> {
    try {
      const result = await this.searchSongs(event, keyword);
      if (!result.tracks.length) {
        await notifyFallback({
          ctx,
          event,
          aiService: this.deps.aiService,
          instruction: `用户点歌关键词「${keyword}」没有结果，请自然建议换关键词。`,
          fallbackMessage: `没有找到「${keyword}」的歌曲结果`,
        });
        return;
      }

      if (!this.deps.screenshotService) {
        await sendTextMessage(
          ctx,
          event,
          `已找到 ${result.tracks.length} 首。发送“听1”播放第一首。`,
        );
        return;
      }

      const html = renderMusicSearchListHtml(result);
      const imagePath = await this.deps.screenshotService.screenshot(html, {
        width: 850,
        height: 100, // 处理极端情况
        fullPage: true,
        type: "png",
        themeMode: "auto",
      });
      await sendImageMessage(ctx, event, imagePath);
      this.deps.logger.info(
        `[music] search rendered query="${keyword}" count=${result.tracks.length}`,
      );
    } catch (error) {
      await notifyFallback({
        ctx,
        event,
        aiService: this.deps.aiService,
        instruction: `music 插件搜索失败。错误：${String(error)}。请简短告知稍后重试。`,
        fallbackMessage: `点歌失败：${String(error)}`,
        error,
      });
    }
  }

  private async sendByIndex(
    ctx: any,
    event: any,
    index: number,
  ): Promise<void> {
    const session = this.getOrCreateSession(event);
    const tracks = session.lastSearch?.tracks || [];
    const target = tracks[index - 1];
    if (!target) {
      await notifyFallback({
        ctx,
        event,
        aiService: this.deps.aiService,
        instruction: `用户请求听第${index}首，但当前列表不足。请提示先点歌或检查编号。`,
        fallbackMessage: `没有第 ${index} 首，请先“点歌 关键词”再选择`,
      });
      return;
    }

    try {
      await this.sendSongById(ctx, event, target.id);
    } catch (error) {
      await notifyFallback({
        ctx,
        event,
        aiService: this.deps.aiService,
        instruction: `用户选择听第${index}首时下载失败。错误：${String(error)}。请简短道歉并建议重试。`,
        fallbackMessage: "播放失败，请稍后重试。",
        error,
      });
    }
  }

  private async sendByKeyword(
    ctx: any,
    event: any,
    keyword: string,
  ): Promise<void> {
    try {
      await this.sendSongByQuery(ctx, event, keyword);
    } catch (error) {
      await notifyFallback({
        ctx,
        event,
        aiService: this.deps.aiService,
        instruction: `用户请求“听${keyword}”时失败。错误：${String(error)}。请简短提示后重试。`,
        fallbackMessage: "播放失败，请稍后重试。",
        error,
      });
    }
  }

  private getOrCreateSession(event: any): MusicSessionState {
    const current = this.sessions.get(event);
    if (current) {
      return current;
    }
    const next: MusicSessionState = {
      provider: this.config.defaultProvider,
      updatedAt: Date.now(),
    };
    this.sessions.set(event, next);
    return next;
  }

  private createProvider(provider: MusicProviderName, mediaUserToken?: string) {
    const finalMediaUserToken =
      String(mediaUserToken || "").trim() ||
      String(this.config.applemusic.defaultMediaUserToken || "").trim() ||
      undefined;

    return createMusicProvider(
      provider,
      {
        applemusic: this.deps.applemusicService,
      },
      {
        mediaUserToken: finalMediaUserToken,
        storefront: this.config.applemusic.storefront,
        language: this.config.applemusic.language,
      },
    );
  }
}
