import * as fs from "fs/promises";
import * as path from "path";
import type { MessageEvent, MessageSegment, MiokuContext } from "mioku";

function normalizeFileSource(file: string): string {
  const value = String(file || "").trim();
  if (!value) {
    return value;
  }
  if (
    value.startsWith("file://") ||
    value.startsWith("base64://") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }
  if (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) {
    const normalized = value.replace(/\\/g, "/");
    return `file:///${normalized.replace(/^\//, "")}`;
  }
  return value;
}

function getBotAndTarget(event: MessageEvent): {
  bot: MessageEvent["bot"];
  groupId?: string;
  userId?: string;
} {
  const groupId = String(event?.group_id ?? "").trim();
  const userId = String(event?.user_id ?? "").trim();

  return {
    bot: event?.bot,
    groupId: event?.message_type === "group" ? groupId : undefined,
    userId: event?.message_type !== "group" ? userId : undefined,
  };
}

async function sendSegments(
  ctx: MiokuContext,
  event: MessageEvent,
  segments: readonly MessageSegment[],
): Promise<void> {
  const { bot, groupId, userId } = getBotAndTarget(event);
  if (bot && groupId != null && groupId !== "") {
    await bot.sendGroupMsg(groupId, [...segments]);
    return;
  }
  if (bot && userId != null && userId !== "") {
    await bot.sendPrivateMsg(userId, [...segments]);
    return;
  }
  if (typeof event?.reply === "function") {
    await event.reply([...segments]);
    return;
  }
  throw new Error("当前上下文不支持消息发送");
}

export async function sendTextMessage(
  ctx: MiokuContext,
  event: MessageEvent,
  text: string,
): Promise<void> {
  await sendSegments(ctx, event, [ctx.segment.text(text)]);
}

export async function sendImageMessage(
  ctx: MiokuContext,
  event: MessageEvent,
  imagePath: string,
): Promise<void> {
  const send = async (source: string): Promise<void> => {
    await sendSegments(ctx, event, [
      ctx.segment.image(normalizeFileSource(source)),
    ]);
  };

  try {
    await send(imagePath);
  } catch {
    const buffer = await fs.readFile(imagePath);
    await send(`base64://${buffer.toString("base64")}`);
  }
}

export async function sendFileMessage(
  ctx: MiokuContext,
  event: MessageEvent,
  filePath: string,
  name: string,
): Promise<void> {
  const ext = path.extname(filePath);
  const fileName = ext ? `${name}${ext}` : name;

  const send = async (source: string): Promise<void> => {
    await sendSegments(ctx, event, [
      ctx.segment.file(normalizeFileSource(source), { name: fileName }),
    ]);
  };

  const canReadLocalFile =
    filePath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(filePath);

  let fileSendError: unknown;
  try {
    await send(filePath);
    return;
  } catch (error) {
    fileSendError = error;
  }

  if (!canReadLocalFile) {
    throw fileSendError instanceof Error
      ? fileSendError
      : new Error(String(fileSendError || "文件发送失败"));
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    throw fileSendError instanceof Error
      ? fileSendError
      : new Error(String(fileSendError || "文件发送失败"));
  }

  try {
    await send(`base64://${buffer.toString("base64")}`);
  } catch (base64Error) {
    const message = String(base64Error || "");
    const timeoutLike =
      message.includes("timeout") ||
      message.includes("超时") ||
      message.includes("timed out") ||
      message.includes("ETIMEDOUT");
    if (timeoutLike) {
      return;
    }
    throw new Error("文件发送失败：路径发送失败，base64 发送也失败");
  }
}

export async function sendRecordMessage(
  ctx: MiokuContext,
  event: MessageEvent,
  audioPath: string,
): Promise<void> {
  const send = async (source: string): Promise<void> => {
    await sendSegments(ctx, event, [
      ctx.segment.record(normalizeFileSource(source)),
    ]);
  };

  const canReadLocalFile =
    audioPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(audioPath);

  let fileSendError: unknown;
  try {
    await send(audioPath);
    return;
  } catch (error) {
    fileSendError = error;
  }

  if (!canReadLocalFile) {
    throw fileSendError instanceof Error
      ? fileSendError
      : new Error(String(fileSendError || "语音发送失败"));
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(audioPath);
  } catch {
    throw fileSendError instanceof Error
      ? fileSendError
      : new Error(String(fileSendError || "语音发送失败"));
  }

  try {
    await send(`base64://${buffer.toString("base64")}`);
  } catch (base64Error) {
    const message = String(base64Error || "");
    const timeoutLike =
      message.includes("timeout") ||
      message.includes("超时") ||
      message.includes("timed out") ||
      message.includes("ETIMEDOUT");
    if (timeoutLike) {
      return;
    }
    throw new Error("语音发送失败：路径发送失败，base64 发送也失败");
  }
}
