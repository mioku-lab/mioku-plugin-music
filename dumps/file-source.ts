import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { Attachment, Logger, MessageEvent, MessageSegment } from "mioku";

export interface IncomingFile {
  readonly name: string;
  saveTo(destPath: string): Promise<void>;
}

type SegmentData = Readonly<Record<string, unknown>>;

const strOf = (data: SegmentData, key: string): string | undefined => {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const isHttpUrl = (value: string | undefined): value is string =>
  typeof value === "string" && /^https?:\/\//i.test(value);

const isAbsoluteFsPath = (value: string | undefined): value is string =>
  typeof value === "string" &&
  (/^\//.test(value) || /^[A-Za-z]:[\\/]/.test(value));

const toFsPath = (value: string): string => {
  if (!value.startsWith("file://")) return value;
  let p = decodeURIComponent(value.slice("file://".length));
  if (/^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
  else if (!p.startsWith("/")) p = `/${p}`;
  return p;
};

const baseNameOf = (value: string): string =>
  path.basename(toFsPath(value).split("?")[0] ?? "");

const looksLikeFileName = (value: string | undefined): value is string =>
  typeof value === "string" && /^[^/\\]+\.[A-Za-z0-9]{1,8}$/.test(value.trim());

const attachmentOf = (seg: MessageSegment): Attachment | undefined => seg.attachment;

async function downloadTo(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`文件下载失败: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

async function copyLocalFile(localPath: string, destPath: string): Promise<void> {
  const local = toFsPath(localPath);
  try {
    await fs.copyFile(local, destPath);
  } catch {
    throw new Error(`本地文件读取失败（bot 与 NapCat 不在同一台机器时属预期）: ${local}`);
  }
}

interface FileSource {
  readonly url?: string;
  readonly localPath?: string;
  readonly base64?: string;
}

async function saveSource(source: FileSource, destPath: string): Promise<void> {
  if (source.base64) {
    await fs.writeFile(destPath, Buffer.from(source.base64, "base64"));
    return;
  }
  if (isHttpUrl(source.url)) {
    await downloadTo(source.url, destPath);
    return;
  }
  if (source.localPath) {
    await copyLocalFile(source.localPath, destPath);
    return;
  }
  throw new Error("无法获取文件下载地址");
}

function describeSource(source: FileSource): string {
  if (source.base64) return "get_file base64";
  if (isHttpUrl(source.url)) return `url ${source.url.slice(0, 80)}`;
  if (source.localPath) return `本地路径 ${source.localPath}`;
  return "未知来源";
}

interface OneBotGetFileResult {
  readonly file?: string;
  readonly url?: string;
  readonly base64?: string;
  readonly file_name?: string;
}

function fromOneBot(
  event: MessageEvent,
  seg: MessageSegment,
  logger: Logger,
): IncomingFile | null {
  const data = seg.data as SegmentData;
  const fileField = strOf(data, "file");
  const name =
    strOf(data, "file_name") ??
    strOf(data, "name") ??
    (looksLikeFileName(fileField) ? fileField.trim() : undefined) ??
    (isAbsoluteFsPath(fileField) ? baseNameOf(fileField) : undefined) ??
    attachmentOf(seg)?.name;
  if (!name) return null;

  const segmentUrl = strOf(data, "url");
  const segmentLocalPaths = [strOf(data, "path"), fileField].filter(
    (value): value is string => typeof value === "string" && isAbsoluteFsPath(value),
  );
  const idCandidates = [
    strOf(data, "file_id"),
    strOf(data, "fid"),
    looksLikeFileName(fileField) ? undefined : fileField,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  const get_file = async (fileId: string): Promise<OneBotGetFileResult | null> => {
    try {
      return await event.bot.sendApi<OneBotGetFileResult>("get_file", {
        file_id: fileId,
        file: fileId,
      });
    } catch (error) {
      logger.warn(`[music] get_file(${fileId.slice(0, 60)}) 失败: ${String(error)}`);
      return null;
    }
  };

  const sourcesFromGetFile = (result: OneBotGetFileResult | null): FileSource[] => {
    if (!result) return [];
    const sources: FileSource[] = [];
    if (typeof result.base64 === "string" && result.base64) {
      sources.push({ base64: result.base64 });
    }
    if (isHttpUrl(result.url)) {
      sources.push({ url: result.url });
    }
    if (typeof result.file === "string" && result.file) {
      sources.push({ localPath: result.file });
    }
    return sources;
  };

  return {
    name,
    async saveTo(destPath: string): Promise<void> {
      let lastError: unknown;

      const trySources = async (
        sources: readonly FileSource[],
        tag: string,
      ): Promise<boolean> => {
        for (const source of sources) {
          try {
            await saveSource(source, destPath);
            logger.info(`[music] ${name}: ${tag} 成功 (${describeSource(source)})`);
            return true;
          } catch (error) {
            lastError = error;
            logger.warn(`[music] ${name}: ${tag} 失败 (${describeSource(source)}): ${String(error)}`);
          }
        }
        return false;
      };

      // 新版 NapCat：段内自带真实下载 URL
      if (isHttpUrl(segmentUrl)) {
        if (await trySources([{ url: segmentUrl }], "消息段 url")) return;
      }

      // 新版 NapCat：get_file（enableLocalFile2Url 时返回 base64，否则返回 NapCat 本地路径）
      for (const fileId of idCandidates) {
        const result = await get_file(fileId);
        if (await trySources(sourcesFromGetFile(result), `get_file(${fileId.slice(0, 60)})`)) return;
      }

      // NapCat 扩展：私聊文件真实 URL
      for (const fileId of idCandidates) {
        try {
          const result = await event.bot.sendApi<{ url?: string }>("get_private_file_url", {
            file_id: fileId,
          });
          if (isHttpUrl(result?.url)) {
            if (await trySources([{ url: result.url }], "get_private_file_url")) return;
          }
        } catch (error) {
          logger.warn(`[music] get_private_file_url(${fileId.slice(0, 60)}) 失败: ${String(error)}`);
        }
      }

      // 旧版 NapCat 兜底：段内是本机绝对路径（bot 与 NapCat 同机时可用）
      if (await trySources(segmentLocalPaths.map((localPath) => ({ localPath })), "本地路径直读")) {
        return;
      }

      throw lastError ?? new Error("无法获取文件下载地址");
    },
  };
}

interface IcqqFriendFileApi {
  pickFriend(userId: string): {
    getFileInfo(fid: string): Promise<{ url?: string; file?: string; name?: string }>;
  };
}

function fromIcqq(event: MessageEvent, seg: MessageSegment): IncomingFile | null {
  const data = seg.data as SegmentData;
  const fileField = strOf(data, "file");
  const fid = strOf(data, "fid") ?? fileField?.replace(/^fid:/, "");
  const name = strOf(data, "name") ?? attachmentOf(seg)?.name;
  if (!fid || !name) return null;

  return {
    name,
    async saveTo(destPath: string): Promise<void> {
      const bot = event.bot.as<IcqqFriendFileApi>();
      if (typeof bot.pickFriend !== "function") {
        throw new Error("当前 icqq bot 不支持 pickFriend，无法下载文件");
      }
      const info = await bot.pickFriend(String(event.user_id ?? "")).getFileInfo(fid);
      await saveSource(
        {
          url: typeof info?.url === "string" ? info.url : undefined,
          localPath: typeof info?.file === "string" ? info.file : undefined,
        },
        destPath,
      );
    },
  };
}

function fromAttachment(_event: MessageEvent, seg: MessageSegment): IncomingFile | null {
  const data = seg.data as SegmentData;
  const attachment = attachmentOf(seg);
  const url = strOf(data, "url") ?? attachment?.url;
  const name =
    strOf(data, "name") ??
    attachment?.name ??
    (isHttpUrl(url) ? decodeURIComponent(baseNameOf(url)) : undefined);
  if (!name || !isHttpUrl(url)) return null;

  return {
    name,
    async saveTo(destPath: string): Promise<void> {
      await downloadTo(url, destPath);
    },
  };
}

function buildIncomingFile(
  event: MessageEvent,
  seg: MessageSegment,
  logger: Logger,
): IncomingFile | null {
  const adapter = event.identity.adapter;
  if (adapter === "onebotv11") return fromOneBot(event, seg, logger);
  if (adapter === "icqq") return fromIcqq(event, seg);
  return fromAttachment(event, seg);
}

export function extractIncomingFiles(
  event: MessageEvent,
  extensions: readonly string[],
  logger: Logger,
): IncomingFile[] {
  const normalized = extensions.map((ext) => ext.toLowerCase());
  const files: IncomingFile[] = [];
  for (const seg of event.message.filterByType("file")) {
    const file = buildIncomingFile(event, seg, logger);
    if (!file) continue;
    if (normalized.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      files.push(file);
    }
  }
  return files;
}
