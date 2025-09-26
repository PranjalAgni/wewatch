// YouTube player states
export enum PlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}

export interface VideoState {
  videoId?: string;
  playerState: PlayerState;
  position: number; // in seconds
  rate: number;
  stampMs: number; // server ms timestamp
  seq: number;
}

export interface VideoControlPayload {
  position?: number;
  videoId?: string;
  at?: number;
}

export interface SocketControlEvent {
  code: string;
  type: 'SET_VIDEO' | 'PLAY' | 'PAUSE' | 'SEEK';
  payload: VideoControlPayload;
}

export interface SocketVideoEvents {
  SNAPSHOT: VideoState;
  SET_VIDEO: { videoId: string };
  PLAY: { position: number; at: number };
  PAUSE: { position: number };
  SEEK: { position: number };
}

export interface YTStateChangeEvent {
  data: number;
  target: unknown; // YouTube player instance, type unknown for safety
}

export type VideoControls = {
  setVideo: (videoId: string) => void;
  play: (position: number) => void;
  pause: (position: number) => void;
  seek: (position: number) => void;
};

// Utility function to create initial video state
export function createInitialVideoState(): VideoState {
  return {
    videoId: undefined,
    playerState: PlayerState.UNSTARTED,
    position: 0,
    rate: 1,
    stampMs: Date.now(),
    seq: 0,
  };
}
