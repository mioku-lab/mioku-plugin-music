export type MusicProviderName = "applemusic";

export const MUSIC_PROVIDER_NAMES: MusicProviderName[] = ["applemusic"];

export interface MusicBaseConfig {
  searchLimit: number;
  defaultProvider: MusicProviderName;
  applemusic: {
    storefront: string;
    language: string;
    defaultMediaUserToken?: string;
  };
}

export interface MusicTrack {
  id: string;
  provider: MusicProviderName;
  title: string;
  artist: string;
  album: string;
  coverUrl?: string;
  durationMs?: number;
  previewUrl?: string;
}

export interface MusicSongDetail {
  id: string;
  provider: MusicProviderName;
  title: string;
  artist: string;
  album: string;
  coverUrl?: string;
  releaseDate?: string;
  durationMs?: number;
  previewUrl?: string;
  audioTraits?: string[];
}

export interface MusicAlbumDetail {
  id: string;
  provider: MusicProviderName;
  title: string;
  artist: string;
  coverUrl?: string;
  releaseDate?: string;
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    durationMs?: number;
  }>;
}

export interface MusicSearchResult {
  query: string;
  provider: MusicProviderName;
  tracks: MusicTrack[];
}

export interface DownloadSongResult {
  filePath: string;
  sourceType: "hls" | "preview";
}

export interface MusicProviderClientOptions {
  mediaUserToken?: string;
  storefront?: string;
  language?: string;
}

export interface MusicProvider {
  readonly name: MusicProviderName;
  searchSongs(query: string, limit?: number): Promise<MusicSearchResult>;
  getSongDetail(songId: string): Promise<MusicSongDetail>;
  getAlbumDetail(albumId: string): Promise<MusicAlbumDetail>;
  downloadSong(songId: string): Promise<DownloadSongResult>;
  downloadCover(coverUrl: string, fileName?: string): Promise<string>;
}

export interface MusicSessionState {
  provider: MusicProviderName;
  mediaUserToken?: string;
  lastSearch?: MusicSearchResult;
  updatedAt: number;
}
