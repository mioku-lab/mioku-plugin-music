import type { AISkill, AITool } from "../../src";
import { getMusicRuntimeState } from "./runtime";

const musicSkills: AISkill[] = [
  {
    name: "music",
    description:
      "搜索音乐/歌曲/专辑/歌手，并可发送歌曲，注意，当用户想让你唱歌时，通常使用该技能而不是发送语音。",
    permission: "member",
    tools: [
      {
        name: "search_music",
        description: "按关键词搜索歌曲",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "搜索关键词，可是歌曲名、歌手或专辑名",
            },
          },
          required: ["query"],
        },
        handler: async (args: any, runtimeCtx?: any) => {
          const runtime = getMusicRuntimeState().runtime;
          const ctx = runtimeCtx?.ctx;
          const event = runtimeCtx?.event || runtimeCtx?.rawEvent;
          if (!runtime || !event) {
            return "music 插件尚未初始化";
          }
          const query = String(args?.query || "").trim();
          if (!query) {
            return "query 不能为空";
          }
          try {
            const result = await runtime.searchSongs(event, query);
            if (!result.tracks.length) {
              return `没有找到「${query}」的歌曲`;
            }
            const list = result.tracks
              .slice(0, 10)
              .map(
                (item, index) =>
                  `${index + 1}. ${item.title} - ${item.artist} (${item.album}) [${item.id}]`,
              )
              .join("\n");
            return `已找到 ${result.tracks.length} 首：\n${list}`;
          } catch (error) {
            if (ctx) {
              await runtime.notifyFailure(
                ctx,
                event,
                `AI 发起音乐搜索失败。错误：${String(error)}。请简短告知稍后再试。`,
                `搜索失败：${String(error)}`,
              );
            }
            return `搜索失败：${String(error)}`;
          }
        },
      } as AITool,
      {
        name: "send_music_song",
        description: "发送歌曲语音（通过 song_id 或 query）",
        parameters: {
          type: "object",
          properties: {
            song_id: {
              type: "string",
              description: "歌曲 ID，优先使用",
            },
            query: {
              type: "string",
              description: "关键词，内部会搜索后发送第一首",
            },
          },
          required: [],
        },
        handler: async (args: any, runtimeCtx?: any) => {
          const runtime = getMusicRuntimeState().runtime;
          const ctx = runtimeCtx?.ctx;
          const event = runtimeCtx?.event || runtimeCtx?.rawEvent;
          if (!runtime || !ctx || !event) {
            return "当前上下文不支持发送歌曲";
          }

          const songId = String(args?.song_id || "").trim();
          const query = String(args?.query || "").trim();
          if (!songId && !query) {
            return "必须提供 song_id 或 query";
          }

          try {
            if (songId) {
              await runtime.sendSongById(ctx, event, songId);
              return "已发送歌曲";
            }

            await runtime.sendSongByQuery(ctx, event, query);
            return "已按关键词发送歌曲";
          } catch (error) {
            await runtime.notifyFailure(
              ctx,
              event,
              `AI 发送歌曲失败。错误：${String(error)}。请简短提示稍后重试。`,
              `发送失败：${String(error)}`,
            );
            return `发送失败：${String(error)}`;
          }
        },
      } as AITool,
    ],
  },
];

export default musicSkills;
