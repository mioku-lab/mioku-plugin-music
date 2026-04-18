import type { MusicBaseConfig } from "./types";

export const MUSIC_DEFAULTS: MusicBaseConfig = {
  searchLimit: 15,
  defaultProvider: "applemusic",
  applemusic: {
    storefront: "cn",
    language: "zh-CN",
    defaultMediaUserToken: "",
  },
};
