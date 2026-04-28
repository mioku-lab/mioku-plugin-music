import type { AIService } from "../../../src/services/ai/types";
import { sendTextMessage } from "./message";

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function notifyFallback(options: {
  ctx: any;
  event: any;
  aiService?: AIService;
  instruction: string;
  fallbackMessage: string;
  error?: unknown;
}): Promise<void> {
  if (options.error != null) {
    options.ctx?.logger?.error?.(
      `[music] ${options.instruction}\n执行错误: ${normalizeErrorMessage(options.error)}`,
    );
  }

  const chatRuntime = options.aiService?.getChatRuntime();
  if (chatRuntime) {
    try {
      await chatRuntime.generateNotice({
        event: options.event,
        instruction: options.instruction,
        send: true,
        promptInjections: [
          {
            title: "Music Plugin Notice",
            content:
              "You are responding for music plugin failures. Keep it concise, friendly, and actionable in Chinese.",
          },
        ],
      });
      return;
    } catch (noticeError) {
      options.ctx?.logger?.error?.(
        `[music] notice 发送失败: ${normalizeErrorMessage(noticeError)}`,
      );
    }
  }

  await sendTextMessage(
    options.ctx,
    options.event,
    options.fallbackMessage,
  );
}
