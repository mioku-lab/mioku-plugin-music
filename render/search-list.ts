import type { MusicSearchResult } from "../types";
import { getMusicProviderLabel } from "../providers/provider-labels";

function escapeHtml(value: string): string {
  const source = String(value || "");
  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderMusicSearchListHtml(search: MusicSearchResult): string {
  const providerLabel = getMusicProviderLabel(search.provider);
  const items = search.tracks
    .map((track, index) => {
      const coverUrl = track.coverUrl
        ? escapeHtml(track.coverUrl.replace("{w}x{h}", "240x240"))
        : "";
      const cover = coverUrl
        ? `<img src="${coverUrl}" alt="cover" class="h-14 w-14 rounded-2xl object-cover ring-1 ring-teal-200/70 dark:ring-teal-300/20" />`
        : `<div class="h-14 w-14 rounded-2xl bg-teal-100/70 text-2xl text-teal-600 dark:bg-teal-400/10 dark:text-teal-300 flex items-center justify-center">♪</div>`;

      return `
        <div class="group relative overflow-hidden rounded-2xl border border-teal-200/60 bg-white/80 p-3 shadow-[0_10px_28px_rgba(6,49,57,0.12)] backdrop-blur-sm transition dark:border-teal-300/20 dark:bg-slate-900/70">
          <div class="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-gradient-to-r from-teal-300/10 via-transparent to-cyan-300/10"></div>
          <div class="relative grid grid-cols-[40px_56px_minmax(0,1fr)] items-center gap-3">
            <div class="h-9 w-9 rounded-full bg-teal-500/12 text-[16px] text-teal-700 dark:text-teal-200 dark:bg-teal-300/15 flex items-center justify-center font-extrabold">${index + 1}</div>
            ${cover}
            <div class="min-w-0">
              <div class="truncate text-[18px] font-extrabold tracking-[0.01em] text-slate-900 dark:text-slate-100">${escapeHtml(track.title)}</div>
              <div class="mt-1 truncate text-[15px] text-slate-600 dark:text-slate-300/90">
                <span>${escapeHtml(track.artist)}</span>
                <span class="mx-1.5 text-slate-400 dark:text-slate-500">·</span>
                <span>${escapeHtml(track.album)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: auto;
        height: auto;
        min-width: 0;
        min-height: 0;
        overflow: visible;
      }
      body {
        display: inline-block;
        background: transparent;
      }
    </style>
    <div class="w-[860px] p-7 font-['Noto_Sans_SC','PingFang_SC','Hiragino_Sans_GB',sans-serif] bg-[radial-gradient(circle_at_0%_0%,rgba(53,210,200,0.22),transparent_40%),radial-gradient(circle_at_92%_14%,rgba(14,165,160,0.2),transparent_38%)] bg-teal-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div class="mb-5 rounded-3xl border border-teal-200/70 bg-white/85 px-7 py-6 shadow-[0_18px_46px_rgba(6,49,57,0.16)] backdrop-blur-sm dark:border-teal-300/20 dark:bg-slate-900/75">
        <div class="text-center text-[36px] leading-[1.08] font-black tracking-[0.01em]">音乐搜索结果</div>
        <div class="mt-2 text-center text-[17px] text-slate-600 dark:text-slate-300">检索歌曲：${escapeHtml(search.query)} · 共 ${search.tracks.length} 条</div>
      </div>
      <div class="grid gap-3">${items}</div>
      <div class="mt-5 flex items-center justify-between text-[16px] text-slate-600 dark:text-slate-300">
        <div>音源：${escapeHtml(providerLabel)}</div>
        <div>发送「听1」播放第一首歌曲</div>
      </div>
    </div>
  `;
}
