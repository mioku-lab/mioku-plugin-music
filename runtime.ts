import type { MusicPluginRuntime } from "./runtime-core/service";
import {
  getPluginRuntimeState,
  resetPluginRuntimeState,
  setPluginRuntimeState,
} from "../../src";

export interface MusicRuntimeState {
  runtime?: MusicPluginRuntime;
}

const MUSIC_PLUGIN_NAME = "music";

export function getMusicRuntimeState(): MusicRuntimeState {
  return getPluginRuntimeState<MusicRuntimeState>(MUSIC_PLUGIN_NAME);
}

export function setMusicRuntimeState(nextState: MusicRuntimeState): MusicRuntimeState {
  return setPluginRuntimeState<MusicRuntimeState>(MUSIC_PLUGIN_NAME, nextState);
}

export function resetMusicRuntimeState(): void {
  resetPluginRuntimeState(MUSIC_PLUGIN_NAME);
}
