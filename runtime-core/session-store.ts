import type { MusicSessionState } from "../types";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function buildSessionKey(event: any): string {
  if (event?.group_id != null) {
    return `group:${String(event.group_id)}`;
  }
  if (event?.user_id != null) {
    return `private:${String(event.user_id)}`;
  }
  return `unknown:${Date.now()}`;
}

export class MusicSessionStore {
  private readonly sessions = new Map<string, MusicSessionState>();

  get(event: any): MusicSessionState | undefined {
    this.cleanup();
    return this.sessions.get(buildSessionKey(event));
  }

  set(event: any, nextState: MusicSessionState): void {
    this.cleanup();
    this.sessions.set(buildSessionKey(event), nextState);
  }

  patch(event: any, patchState: Partial<MusicSessionState>): MusicSessionState {
    const current = this.get(event) || {
      provider: "applemusic" as const,
      updatedAt: Date.now(),
    };
    const next = {
      ...current,
      ...patchState,
      updatedAt: Date.now(),
    };
    this.set(event, next);
    return next;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.sessions.entries()) {
      if (now - state.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(key);
      }
    }
  }
}
