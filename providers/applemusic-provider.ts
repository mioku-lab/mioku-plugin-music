import type { AppleMusicServiceApi } from "../../../src/services/applemusic/types";
import type {
  DownloadSongResult,
  MusicAlbumDetail,
  MusicProvider,
  MusicProviderClientOptions,
  MusicProviderName,
  MusicSearchResult,
  MusicSongDetail,
  MusicTrack,
} from "../types";

function mapTrack(item: any): MusicTrack {
  return {
    id: item.id,
    provider: "applemusic",
    title: item.name,
    artist: item.artistName,
    album: item.albumName,
    coverUrl: item.artworkUrl,
    durationMs: item.durationInMillis,
    previewUrl: item.previewUrl,
  };
}

export class AppleMusicProvider implements MusicProvider {
  readonly name: MusicProviderName = "applemusic";
  private readonly client: ReturnType<AppleMusicServiceApi["createClient"]>;

  constructor(api: AppleMusicServiceApi, options?: MusicProviderClientOptions) {
    this.client = api.createClient({
      mediaUserToken: options?.mediaUserToken,
      storefront: options?.storefront || "cn",
      language: options?.language || "zh-CN",
      allowPreviewFallback: false,
    });
  }

  async searchSongs(query: string, limit: number = 15): Promise<MusicSearchResult> {
    const result = await this.client.searchSongs({
      query,
      limit,
    });
    return {
      query,
      provider: "applemusic",
      tracks: result.songs.map(mapTrack),
    };
  }

  async getSongDetail(songId: string): Promise<MusicSongDetail> {
    const detail = await this.client.getSongDetail({ songId });
    return {
      id: detail.id,
      provider: "applemusic",
      title: detail.name,
      artist: detail.artistName,
      album: detail.albumName,
      coverUrl: detail.artworkUrl,
      releaseDate: detail.releaseDate,
      durationMs: detail.durationInMillis,
      previewUrl: detail.previewUrl,
      audioTraits: detail.audioTraits,
    };
  }

  async getAlbumDetail(albumId: string): Promise<MusicAlbumDetail> {
    const detail = await this.client.getAlbumDetail({ albumId });
    return {
      id: detail.id,
      provider: "applemusic",
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
      size: "1200x1200",
    });
    return result.filePath;
  }
}
