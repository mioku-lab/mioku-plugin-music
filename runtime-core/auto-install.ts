import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import type { Logger } from "mioku";
import type { MusicBaseConfig } from "../types";

const SERVICE_PACKAGE_PREFIX = "mioku-service-";
const attempted = new Set<string>();

function desiredServiceShortNames(config: MusicBaseConfig): string[] {
  const names: string[] = [];
  for (const value of [config.defaultProvider, config.dumpProvider]) {
    const short = String(value ?? "").trim().toLowerCase();
    if (short) names.push(short);
  }
  return [...new Set(names)];
}

function isPackageInstalled(pkgName: string): boolean {
  return existsSync(path.join(process.cwd(), "node_modules", pkgName, "package.json"));
}

export function installMissingOptionalServices(
  logger: Logger,
  config: MusicBaseConfig,
): void {
  for (const short of desiredServiceShortNames(config)) {
    const pkgName = `${SERVICE_PACKAGE_PREFIX}${short}`;
    if (attempted.has(pkgName) || isPackageInstalled(pkgName)) continue;
    attempted.add(pkgName);

    logger.info(
      `[music] ${short} 已在配置中启用但服务包未安装，正在后台执行 bun add ${pkgName}，完成后重启生效`,
    );
    const child = spawn("bun", ["add", pkgName], {
      cwd: process.cwd(),
      detached: true,
      shell: process.platform === "win32",
      stdio: "ignore",
      windowsHide: true,
    });
    child.on("error", (err: unknown) => {
      logger.warn(`[music] 自动安装 ${pkgName} 失败: ${String(err)}`);
    });
    child.on("close", (code: number | null) => {
      if (code === 0) {
        logger.info(`[music] ${pkgName} 安装完成，重启后生效`);
      } else {
        logger.warn(`[music] 自动安装 ${pkgName} 失败（退出码 ${code ?? "unknown"}）`);
      }
    });
    child.unref();
  }
}
