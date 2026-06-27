import type { MusicPluginRuntime } from "./runtime-core/service";
import {
  getPluginRuntimeState,
  resetPluginRuntimeState,
  setPluginRuntimeState,
} from "mioku";

export interface MusicRuntimeState {
  runtime?: MusicPluginRuntime;
}

const MUSIC_PLUGIN_NAME = "music";

export function getMusicRuntimeState(): MusicRuntimeState {
  return getPluginRuntimeState(MUSIC_PLUGIN_NAME) as MusicRuntimeState;
}

export function setMusicRuntimeState(nextState: MusicRuntimeState): MusicRuntimeState {
  return setPluginRuntimeState(MUSIC_PLUGIN_NAME, nextState) as MusicRuntimeState;
}

export function resetMusicRuntimeState(): void {
  resetPluginRuntimeState(MUSIC_PLUGIN_NAME);
}
