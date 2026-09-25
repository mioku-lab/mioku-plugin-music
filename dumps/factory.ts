import type { NcmdumpServiceApi } from "mioku-service-ncmdump";
import type { DumpProviderName } from "../types";
import { NcmdumpProvider } from "./ncmdump";
import type { DumpProvider } from "./types";

export interface DumpProviderFactoryOptions {
  ncmdump?: NcmdumpServiceApi;
}

interface DumpProviderRegistryItem {
  readonly name: DumpProviderName;
  readonly serviceName: string;
  readonly extensions: readonly string[];
  isAvailable(services: DumpProviderFactoryOptions): boolean;
  create(services: DumpProviderFactoryOptions): DumpProvider;
}

const DUMP_PROVIDER_REGISTRY: DumpProviderRegistryItem[] = [
  {
    name: "ncmdump",
    serviceName: "ncmdump",
    extensions: [".ncm"],
    isAvailable: (services) => Boolean(services.ncmdump),
    create: (services) => {
      if (!services.ncmdump) {
        throw new Error("ncmdump 服务未加载");
      }
      return new NcmdumpProvider(services.ncmdump);
    },
  },
];

function getDumpProviderRegistryItem(
  providerName: string,
): DumpProviderRegistryItem | undefined {
  const normalized = String(providerName || "").trim().toLowerCase();
  return DUMP_PROVIDER_REGISTRY.find((item) => item.name === normalized);
}

export function resolveDumpProviderName(
  preferredProviderName: unknown,
  services: DumpProviderFactoryOptions,
): DumpProviderName | null {
  const preferred = String(preferredProviderName || "").trim();
  if (preferred) {
    const item = getDumpProviderRegistryItem(preferred);
    if (item?.isAvailable(services)) {
      return item.name;
    }
  }
  return null;
}

export function getDumpProviderCandidates(): DumpProviderName[] {
  return DUMP_PROVIDER_REGISTRY.map((item) => item.name);
}

export function createDumpProvider(
  providerName: DumpProviderName,
  services: DumpProviderFactoryOptions,
): DumpProvider {
  const item = getDumpProviderRegistryItem(providerName);
  if (!item) {
    throw new Error(`不支持的 dump 服务: ${providerName}`);
  }
  if (!item.isAvailable(services)) {
    throw new Error(`${item.serviceName} 服务未加载`);
  }
  return item.create(services);
}

export function dumpProviderExtensions(
  providerName: DumpProviderName,
): readonly string[] {
  return (
    getDumpProviderRegistryItem(providerName)?.extensions ?? []
  );
}
