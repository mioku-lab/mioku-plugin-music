import * as fs from "fs/promises";

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
    return `file://${value}`;
  }
  return value;
}

function getBotAndTarget(ctx: any, event: any): {
  bot: any;
  groupId?: number;
  userId?: number;
} {
  const selfId = event?.self_id != null ? Number(event.self_id) : undefined;
  const bot =
    selfId != null && typeof ctx?.pickBot === "function"
      ? ctx.pickBot(selfId)
      : undefined;

  return {
    bot,
    groupId: event?.message_type === "group" ? Number(event.group_id) : undefined,
    userId: event?.message_type !== "group" ? Number(event?.user_id) : undefined,
  };
}

export async function sendTextMessage(
  ctx: any,
  event: any,
  text: string,
): Promise<void> {
  const { bot, groupId, userId } = getBotAndTarget(ctx, event);
  const payload: any[] = [];

  payload.push(ctx?.segment?.text ? ctx.segment.text(text) : { type: "text", text });

  if (bot && groupId != null) {
    await bot.sendGroupMsg(groupId, payload);
    return;
  }
  if (bot && userId != null) {
    await bot.sendPrivateMsg(userId, payload);
    return;
  }
  if (typeof event?.reply === "function") {
    await event.reply(text);
    return;
  }
  throw new Error("当前上下文不支持文本发送");
}

export async function sendImageMessage(
  ctx: any,
  event: any,
  imagePath: string,
): Promise<void> {
  const { bot, groupId, userId } = getBotAndTarget(ctx, event);
  const sendPayload = async (source: string) => {
    const payload: any[] = [];
    payload.push(
      ctx?.segment?.image
        ? ctx.segment.image(normalizeFileSource(source))
        : { type: "image", file: normalizeFileSource(source) },
    );

    if (bot && groupId != null) {
      await bot.sendGroupMsg(groupId, payload);
      return;
    }
    if (bot && userId != null) {
      await bot.sendPrivateMsg(userId, payload);
      return;
    }
    if (typeof event?.reply === "function") {
      await event.reply(payload);
      return;
    }
    throw new Error("当前上下文不支持图片发送");
  };

  try {
    await sendPayload(imagePath);
  } catch {
    const buffer = await fs.readFile(imagePath);
    const base64 = `base64://${buffer.toString("base64")}`;
    await sendPayload(base64);
  }
}

export async function sendRecordMessage(
  ctx: any,
  event: any,
  audioPath: string,
): Promise<void> {
  const { bot, groupId, userId } = getBotAndTarget(ctx, event);
  const sendPayload = async (source: string) => {
    const payload: any[] = [];
    payload.push(
      ctx?.segment?.record
        ? ctx.segment.record(normalizeFileSource(source))
        : { type: "record", file: normalizeFileSource(source) },
    );

    if (bot && groupId != null) {
      await bot.sendGroupMsg(groupId, payload);
      return;
    }
    if (bot && userId != null) {
      await bot.sendPrivateMsg(userId, payload);
      return;
    }
    if (typeof event?.reply === "function") {
      await event.reply(payload);
      return;
    }
    throw new Error("当前上下文不支持语音发送");
  };

  const canReadLocalFile =
    audioPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(audioPath);

  let fileSendError: unknown;
  try {
    await sendPayload(audioPath);
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

  const base64 = `base64://${buffer.toString("base64")}`;
  try {
    await sendPayload(base64);
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
