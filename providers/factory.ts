import type { AppleMusicServiceApi } from "../../../src/services/applemusic/types";
import { AppleMusicProvider } from "./applemusic-provider";
import {
  type MusicProvider,
  type MusicProviderClientOptions,
  type MusicProviderName,
} from "../types";

export interface MusicProviderFactoryOptions {
  applemusic?: AppleMusicServiceApi;
}

interface MusicProviderRegistryItem {
  readonly name: MusicProviderName;
  readonly serviceName: string;
  isAvailable(services: MusicProviderFactoryOptions): boolean;
  create(
    services: MusicProviderFactoryOptions,
    clientOptions?: MusicProviderClientOptions,
  ): MusicProvider;
}

const MUSIC_PROVIDER_REGISTRY: MusicProviderRegistryItem[] = [
  {
    name: "applemusic",
    serviceName: "applemusic",
    isAvailable: (services) => Boolean(services.applemusic),
    create: (services, clientOptions) => {
      if (!services.applemusic) {
        throw new Error("applemusic 服务未加载");
      }
      return new AppleMusicProvider(services.applemusic, clientOptions);
    },
  },
];

function getProviderRegistryItem(
  providerName: string,
): MusicProviderRegistryItem | undefined {
  const normalized = String(providerName || "").trim();
  return MUSIC_PROVIDER_REGISTRY.find((item) => item.name === normalized);
}

export function resolveMusicProviderName(
  preferredProviderName: unknown,
  services: MusicProviderFactoryOptions,
): MusicProviderName | null {
  const preferred = String(preferredProviderName || "").trim();
  if (preferred) {
    const preferredItem = getProviderRegistryItem(preferred);
    if (preferredItem?.isAvailable(services)) {
      return preferredItem.name;
    }
  }

  const fallbackItem = MUSIC_PROVIDER_REGISTRY.find((item) =>
    item.isAvailable(services),
  );
  return fallbackItem?.name || null;
}

export function getMusicProviderCandidates(): MusicProviderName[] {
  return MUSIC_PROVIDER_REGISTRY.map((item) => item.name);
}

export function createMusicProvider(
  providerName: MusicProviderName,
  services: MusicProviderFactoryOptions,
  clientOptions?: MusicProviderClientOptions,
): MusicProvider {
  const item = getProviderRegistryItem(providerName);
  if (!item) {
    throw new Error(`不支持的音乐源: ${providerName}`);
  }

  if (!item.isAvailable(services)) {
    throw new Error(`${item.serviceName} 服务未加载`);
  }

  return item.create(services, clientOptions);
}
