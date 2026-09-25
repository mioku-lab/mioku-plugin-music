import type { NcmdumpServiceApi } from "mioku-service-ncmdump";
import type { DumpProviderName } from "../types";
import type { DumpProvider, DumpResult, DumpTarget } from "./types";

export class NcmdumpProvider implements DumpProvider {
  readonly name: DumpProviderName = "ncmdump";
  readonly extensions: readonly string[] = [".ncm"];

  private readonly service: NcmdumpServiceApi;

  constructor(service: NcmdumpServiceApi) {
    this.service = service;
  }

  async dump(target: DumpTarget): Promise<DumpResult> {
    const result = await this.service.convert({
      inputPath: target.sourcePath,
      outputDir: target.outputDir,
    });
    return { filePath: result.filePath, fileName: result.fileName };
  }
}
