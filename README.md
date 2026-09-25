# mioku-plugin-music

## 功能

- 点歌搜索：`.点歌 晴天`
- 搜索结果截图列表
- 编号听歌（语音）：`.听1`
- 编号听歌（原曲文件，群聊也直接发文件）：`.原曲1`
- 私聊文件解密：私聊发送匹配后缀的文件
- AI skills：搜索、发送歌曲

## 已适配 Provider

- `applemusic`
- `netease`

## 已适配 Dump Provider

- `ncmdump`（`mioku-service-ncmdump`，支持 `.ncm`）

## 可选服务与自动安装

`defaultProvider` / `dumpProvider` 对应的服务都是可选安装：

1. 在配置中选择（如 `base.dumpProvider = "ncmdump"`）
2. 重启 Bot，插件检测到服务包未安装时自动在后台执行 `bun add mioku-service-ncmdump`（从 npm）
3. 再次重启后服务加载，功能生效

## Dump Provider 对接要求

`music` 插件通过"服务 API + dump provider 适配器"接入新的解密服务（如 kgm/qmc 等）。规范与 music provider 对称：

### 1. 服务 API 标准（服务包侧）

服务包（`mioku-service-<name>`）需导出 `defineService` 的 `ServiceRef` 并实现以下接口：

```ts
export interface DumpConvertInput {
  readonly inputPath: string; // 已下载到本地的加密文件
  readonly outputDir?: string; // 缺省为输入文件所在目录
}

export interface DumpConvertOutput {
  readonly filePath: string; // 解密后的本地文件
  readonly fileName: string; // 输出文件名（含扩展名）
}

export interface DumpServiceApi {
  ensureReady(): Promise<unknown>; // 确保二进制/依赖可用
  convert(input: DumpConvertInput): Promise<DumpConvertOutput>;
}
```

服务自身负责二进制/外部依赖的跨平台引导（Homebrew、gh-proxy 下载解压等），插件不感知平台差异。参考实现见 `mioku-service-ncmdump`。

### 2. 插件侧适配器标准（`DumpProvider`）

在 `dumps/` 下新增适配器并注册到 `dumps/factory.ts` 的 `DUMP_PROVIDER_REGISTRY`：

```ts
export interface DumpProvider {
  readonly name: DumpProviderName;
  readonly extensions: readonly string[]; // 触发后缀，如 [".ncm"]
  dump(target: DumpTarget): Promise<DumpResult>;
}

export interface DumpTarget {
  readonly sourcePath: string; // 已下载到本地的加密文件
  readonly fileName: string; // 原始文件名
  readonly outputDir: string; // 输出目录（temp/ncmdump/jobs/<id>）
}

export interface DumpResult {
  readonly filePath: string; // 解密后的本地文件
  readonly fileName: string; // 输出文件名
}
```

同时补齐：`types.ts` 的 `DumpProviderName` / `DUMP_PROVIDER_NAMES`、`config.md` 的 `base.dumpProvider` 选项、`package.json` 的 peer/devDependencies。

### 3. 行为约束

- 只在**私聊**触发；文件名后缀匹配 `extensions` 才下载，尽量不拉取无关文件
- **全程静默**：不回复任何进度或错误消息，成功直接发送结果文件；每个阶段的成败与原因都写入 ctx logger
- 每个文件独立转换、串行执行，转换与下载产物放在 `temp/ncmdump/jobs/<id>/`，发送完成后清理
- `convert` 一次只处理一个文件；失败抛 `Error`，由上层统一记录日志

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
