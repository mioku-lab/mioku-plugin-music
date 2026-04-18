import type { AIService } from "../../../src/services/ai/types";
import { sendTextMessage } from "./message";

export async function notifyFallback(options: {
  ctx: any;
  event: any;
  aiService?: AIService;
  instruction: string;
  fallbackMessage: string;
}): Promise<void> {
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
    } catch {
      // fall through
    }
  }

  await sendTextMessage(
    options.ctx,
    options.event,
    options.fallbackMessage,
  );
}
