import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { Logger, MessageEvent, MiokuContext } from "mioku";
import type { DumpProvider } from "../dumps/types";
import type { IncomingFile } from "../dumps/file-source";
import { sendFileMessage } from "./message";

const DUMP_TEMP_ROOT = path.join(process.cwd(), "temp", "ncmdump");
const JOBS_DIR = path.join(DUMP_TEMP_ROOT, "jobs");

function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[\u0000-\u001f]/g, "");
  return base.length > 0 ? base : `file-${Date.now()}`;
}

function stripExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index > 0 ? fileName.slice(0, index) : fileName;
}

function shortError(error: unknown): string {
  return String(error)
    .replace(/^Error:\s*/, "")
    .trim()
    .slice(0, 160);
}

async function createJobDir(): Promise<string> {
  const jobDir = path.join(JOBS_DIR, `${Date.now()}-${randomUUID().slice(0, 8)}`);
  await fs.mkdir(jobDir, { recursive: true });
  return jobDir;
}

export class DumpFlow {
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly deps: { logger: Logger }) {}

  enqueue(ctx: MiokuContext, event: MessageEvent, provider: DumpProvider, file: IncomingFile): void {
    this.tail = this.tail
      .then(() => this.process(ctx, event, provider, file))
      .catch((error: unknown) => {
        this.deps.logger.warn(`[music] dump 任务异常: ${shortError(error)}`);
      });
  }

  private async process(
    ctx: MiokuContext,
    event: MessageEvent,
    provider: DumpProvider,
    file: IncomingFile,
  ): Promise<void> {
    const { logger } = this.deps;
    const jobDir = await createJobDir();
    try {
      const sourcePath = path.join(jobDir, sanitizeFileName(file.name));
      await file.saveTo(sourcePath);
      const result = await provider.dump({
        sourcePath,
        fileName: file.name,
        outputDir: jobDir,
      });
      await sendFileMessage(ctx, event, result.filePath, stripExtension(result.fileName));
      logger.info(`[music] dump 完成: ${file.name} -> ${result.fileName} (${provider.name})`);
    } catch (error) {
      logger.error(`[music] dump 失败 (${file.name}): ${shortError(error)}`);
    } finally {
      await fs.rm(jobDir, { recursive: true, force: true });
    }
  }
}
