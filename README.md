# mioku-plugin-music

## 功能

- 点歌搜索：`点歌 晴天`
- 搜索结果截图列表
- 编号听歌：`听1`
- 关键词直听：`听晴天`
- AI skills：搜索、发送歌曲

## 已适配 Provider

- `applemusic`

## Provider 对接要求

`music` 插件通过“服务 API + provider 适配器”接入新音乐源。下面是完整接口约束和实现模板。

### 1. 服务 API（`ctx.services.<provider>`）标准

服务侧应暴露 `createClient(options)`，返回一个 client。推荐实现如下：

```ts
export interface ProviderClientOptions {
  token?: string;
  timeoutMs?: number;
  // 其他需要的内容
}

export interface ProviderSearchSongItem {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  artworkUrl?: string;
  previewUrl?: string;
  durationInMillis?: number;
}

export interface ProviderSearchResult {
  query: string;
  songs: ProviderSearchSongItem[];
}

export interface ProviderSongDetail {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  artworkUrl?: string;
  releaseDate?: string;
  durationInMillis?: number;
  previewUrl?: string;
  audioTraits?: string[];
}

export interface ProviderAlbumTrack {
  id: string;
  name: string;
  artistName: string;
  durationInMillis?: number;
}

export interface ProviderAlbumDetail {
  id: string;
  name: string;
  artistName: string;
  artworkUrl?: string;
  releaseDate?: string;
  tracks: ProviderAlbumTrack[];
}

export interface ProviderSongDownloadResult {
  filePath: string; // 本地可读路径，供 record 发送
  sourceType: "hls" | "preview";
}

export interface ProviderCoverDownloadResult {
  filePath: string; // 本地可读路径
}

export interface ProviderClient {
  searchSongs(options: {
    query: string;
    limit?: number;
    offset?: number;
    storefront?: string;
    language?: string;
  }): Promise<ProviderSearchResult>;

  getSongDetail(options: {
    songId: string;
    storefront?: string;
    language?: string;
  }): Promise<ProviderSongDetail>;

  getAlbumDetail(options: {
    albumId: string;
    storefront?: string;
    language?: string;
  }): Promise<ProviderAlbumDetail>;

  downloadSongAac(options: {
    songId: string;
    outputDir?: string;
    fileName?: string;
    storefront?: string;
    language?: string;
  }): Promise<ProviderSongDownloadResult>;

  downloadCover(options: {
    artworkUrl: string;
    outputDir?: string;
    fileName?: string;
    size?: string;
  }): Promise<ProviderCoverDownloadResult>;
}

export interface ProviderServiceApi {
  createClient(options?: ProviderClientOptions): ProviderClient;
}
```

### 2. 插件侧 Provider 适配器标准（`MusicProvider`）

适配器负责把服务返回值映射成 music 插件统一结构，需满足：

```ts
export interface MusicProvider {
  readonly name: MusicProviderName;
  searchSongs(query: string, limit?: number): Promise<MusicSearchResult>;
  getSongDetail(songId: string): Promise<MusicSongDetail>;
  getAlbumDetail(albumId: string): Promise<MusicAlbumDetail>;
  downloadSong(songId: string): Promise<DownloadSongResult>;
  downloadCover(coverUrl: string, fileName?: string): Promise<string>;
}
```

实现模板：

```ts
export class XxxMusicProvider implements MusicProvider {
  readonly name: MusicProviderName = "xxxmusic";
  private readonly client: ProviderClient;

  constructor(api: ProviderServiceApi, options?: MusicProviderClientOptions) {
    this.client = api.createClient({
      mediaUserToken: options?.mediaUserToken,
      storefront: options?.storefront,
      language: options?.language,
    });
  }

  async searchSongs(query: string, limit = 15): Promise<MusicSearchResult> {
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
        previewUrl: item.previewUrl,
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
      previewUrl: detail.previewUrl,
      audioTraits: detail.audioTraits,
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
      size: "1200x1200",
    });
    return result.filePath;
  }
}
```

### 3. 错误与返回约束

- 搜索无结果时返回空数组，不要抛错。
- 参数非法、鉴权失败、网络失败、资源不存在时抛 `Error`，由上层统一提示。
- `downloadSong` 必须返回可读的本地音频路径；`sourceType` 只能是 `"hls"` 或 `"preview"`。
- 统一结构里的 `provider` 字段必须始终等于当前 provider 名称，不能留空或混用。
- 返回值中的可选字段允许缺省，但字段类型必须稳定（例如 `durationMs` 始终是 number 或 undefined）。

Provider 编写完成后可在本仓库提出issue请求适配，我们也欢迎积极的PR :)
