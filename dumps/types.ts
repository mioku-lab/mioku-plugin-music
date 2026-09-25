import type { DumpProviderName } from "../types";

export interface DumpTarget {
  readonly sourcePath: string;
  readonly fileName: string;
  readonly outputDir: string;
}

export interface DumpResult {
  readonly filePath: string;
  readonly fileName: string;
}

export interface DumpProvider {
  readonly name: DumpProviderName;
  readonly extensions: readonly string[];
  dump(target: DumpTarget): Promise<DumpResult>;
}
