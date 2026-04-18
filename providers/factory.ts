import type { AppleMusicServiceApi } from "../../../src/services/applemusic/types";
import { AppleMusicProvider } from "./applemusic-provider";
import {
  MUSIC_PROVIDER_NAMES,
  type MusicProvider,
  type MusicProviderClientOptions,
  type MusicProviderName,
} from "../types";

export interface MusicProviderFactoryOptions {
  applemusic?: AppleMusicServiceApi;
}

export function createMusicProvider(
  providerName: MusicProviderName,
  services: MusicProviderFactoryOptions,
  clientOptions?: MusicProviderClientOptions,
): MusicProvider {
  if (!MUSIC_PROVIDER_NAMES.includes(providerName)) {
    throw new Error(`不支持的音乐源: ${providerName}`);
  }

  if (providerName === "applemusic") {
    if (!services.applemusic) {
      throw new Error("applemusic 服务未加载");
    }
    return new AppleMusicProvider(services.applemusic, clientOptions);
  }

  throw new Error(`不支持的音乐源: ${providerName}`);
}
