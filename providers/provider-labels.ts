import type { MusicProviderName } from "../types";

export const MUSIC_PROVIDER_LABELS: Record<MusicProviderName, string> = {
  applemusic: "Apple Music",
};

export function getMusicProviderLabel(provider: MusicProviderName | string): string {
  const key = String(provider || "").trim() as MusicProviderName;
  return MUSIC_PROVIDER_LABELS[key] || key || "Unknown";
}
