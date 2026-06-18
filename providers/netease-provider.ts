import type { NeteaseServiceApi } from "mioku-service-netease";
import type {
  DownloadSongResult,
  MusicAlbumDetail,
  MusicProvider,
  MusicProviderClientOptions,
  MusicProviderName,
  MusicSearchResult,
  MusicSongDetail,
} from "../types";

export class NeteaseProvider implements MusicProvider {
  readonly name: MusicProviderName = "netease";
  private readonly client: ReturnType<NeteaseServiceApi["createClient"]>;

  constructor(api: NeteaseServiceApi, options?: MusicProviderClientOptions) {
    this.client = api.createClient({
      cookie: options?.neteaseCookie,
      quality: options?.neteaseQuality,
    });
  }

  async searchSongs(query: string, limit: number = 15): Promise<MusicSearchResult> {
    const result = await this.client.searchSongs({ query, limit });
    return {
      query,
      provider: this.name,
      tracks: result.songs.map((item) => ({
        id: item.id,
        provider: this.name,
        title: item.name,
        artist: item.artistName,
        album: item.albumName,
        coverUrl: item.artworkUrl,
        durationMs: item.durationInMillis,
      })),
    };
  }

  async getSongDetail(songId: string): Promise<MusicSongDetail> {
    const detail = await this.client.getSongDetail({ songId });
    return {
      id: detail.id,
      provider: this.name,
      title: detail.name,
      artist: detail.artistName,
      album: detail.albumName,
      coverUrl: detail.artworkUrl,
      releaseDate: detail.releaseDate,
      durationMs: detail.durationInMillis,
    };
  }

  async getAlbumDetail(albumId: string): Promise<MusicAlbumDetail> {
    const detail = await this.client.getAlbumDetail({ albumId });
    return {
      id: detail.id,
      provider: this.name,
      title: detail.name,
      artist: detail.artistName,
      coverUrl: detail.artworkUrl,
      releaseDate: detail.releaseDate,
      tracks: detail.tracks.map((track) => ({
        id: track.id,
        title: track.name,
        artist: track.artistName,
        durationMs: track.durationInMillis,
      })),
    };
  }

  async downloadSong(songId: string): Promise<DownloadSongResult> {
    const result = await this.client.downloadSongAac({ songId });
    return {
      filePath: result.filePath,
      sourceType: result.sourceType,
    };
  }

  async downloadCover(coverUrl: string, fileName?: string): Promise<string> {
    const result = await this.client.downloadCover({
      artworkUrl: coverUrl,
      fileName: fileName || "cover",
      size: 1200,
    });
    return result.filePath;
  }
}
