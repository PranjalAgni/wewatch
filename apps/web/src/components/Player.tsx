/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Socket } from "socket.io-client";
import { VideoManager } from "@/lib/VideoManager";
import {
  VideoState,
  VideoControls,
  YTStateChangeEvent,
  SocketVideoEvents,
  createInitialVideoState,
  PlayerState,
} from "@/types/video";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    _ytLoaded?: boolean;
  }
}

interface PlayerProps {
  socket: Socket | null;
  connected: boolean;
  roomCode: string;
  canControl?: boolean;
}

export interface PlayerRef {
  controls: VideoControls;
  videoState: VideoState | null;
}

const Player = forwardRef<PlayerRef, PlayerProps>(function Player(
  { socket, connected, roomCode, canControl = true },
  ref
) {
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const videoManagerRef = useRef<VideoManager | null>(null);
  const isUpdatingFromSocket = useRef<boolean>(false);

  // Initialize VideoManager once and update it when needed
  useEffect(() => {
    if (!videoManagerRef.current && roomCode) {
      videoManagerRef.current = new VideoManager(socket, roomCode);
    } else if (videoManagerRef.current) {
      // Update existing VideoManager with new socket/roomCode
      videoManagerRef.current.updateSocket(socket);
      videoManagerRef.current.updateRoomCode(roomCode);
    }
  }, [socket, roomCode]);

  // Load YouTube API once
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!window._ytLoaded) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window._ytLoaded = true;
      window.onYouTubeIframeAPIReady = () => {
        // YouTube API Ready
      };
    }
  }, []);

  // YouTube state change handler - prevents event loops
  const handleYouTubeStateChange = useCallback(
    (event: YTStateChangeEvent): void => {
       // Ignore events that we triggered from socket updates
      if (isUpdatingFromSocket.current) {
        return;
      }

      if (
        !canControl ||
        !videoManagerRef.current ||
        !videoManagerRef.current.isReady()
      ) {
        return;
      }

      const currentTime = playerRef.current?.getCurrentTime?.() ?? 0;

      switch (event.data) {
        case window.YT?.PlayerState.PLAYING: {
          videoManagerRef.current.play(currentTime);
          break;
        }
        case window.YT?.PlayerState.PAUSED: {
          videoManagerRef.current.pause(currentTime);
          break;
        }
        // We could add more states here if needed (ended, buffering, etc.)
      }
    },
    [canControl]
  );

  // Create YouTube player
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.YT?.Player && mountRef.current && !playerRef.current) {
        playerRef.current = new window.YT.Player(mountRef.current, {
          videoId: "",
          playerVars: {
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onStateChange: handleYouTubeStateChange,
            onReady: () => {
              // YouTube Player Ready
            },
            onError: (event: unknown) => {
              console.error("YouTube Player Error:", event);
            },
          },
        });
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [canControl, handleYouTubeStateChange]);

  // Socket event handlers (stable references)
  const handleSnapshot = useCallback((snap: VideoState): void => {
    setVideoState(snap);
  }, []);

  const handleSetVideo = useCallback(
    ({ videoId }: SocketVideoEvents["SET_VIDEO"]): void => {
      setVideoState((prev) => ({
        ...(prev ?? createInitialVideoState()),
        videoId,
      }));
    },
    []
  );

  const handlePlay = useCallback(
    ({ position, at }: SocketVideoEvents["PLAY"]): void => {
      setVideoState((prev) =>
        prev
          ? { ...prev, playerState: PlayerState.PLAYING, position, stampMs: at }
          : {
              ...createInitialVideoState(),
              playerState: PlayerState.PLAYING,
              position,
              stampMs: at,
            }
      );
    },
    []
  );

  const handlePause = useCallback(
    ({ position }: SocketVideoEvents["PAUSE"]): void => {
      setVideoState((prev) =>
        prev
          ? { ...prev, playerState: PlayerState.PAUSED, position }
          : { ...createInitialVideoState(), playerState: PlayerState.PAUSED, position }
      );
    },
    []
  );

  const handleSeek = useCallback(
    ({ position }: SocketVideoEvents["SEEK"]): void => {
      setVideoState((prev) =>
        prev
          ? { ...prev, position }
          : { ...createInitialVideoState(), position }
      );
    },
    []
  );

  // Socket event listeners - only register when socket changes, not when connected changes
  useEffect(() => {
    if (!socket) {
      return;
    }

    // Register event listeners
    socket.on("SNAPSHOT", handleSnapshot);
    socket.on("SET_VIDEO", handleSetVideo);
    socket.on("PLAY", handlePlay);
    socket.on("PAUSE", handlePause);
    socket.on("SEEK", handleSeek);

    // Cleanup function
    return () => {
      socket.off("SNAPSHOT", handleSnapshot);
      socket.off("SET_VIDEO", handleSetVideo);
      socket.off("PLAY", handlePlay);
      socket.off("PAUSE", handlePause);
      socket.off("SEEK", handleSeek);
    };
  }, [
    socket,
    handleSnapshot,
    handleSetVideo,
    handlePlay,
    handlePause,
    handleSeek,
  ]);

  // Apply videoState changes to YouTube player
  useEffect(() => {
    setTimeout(() => {
      if (
        !connected ||
        !videoState ||
        !playerRef.current ||
        !videoState.videoId
      ) {
        return;
      }

      // Flag to prevent triggering our own event handler
      isUpdatingFromSocket.current = true;

      const effectivePos = videoState.playerState === PlayerState.PLAYING
        ? videoState.position +
          ((Date.now() - videoState.stampMs) / 1000) * (videoState.rate ?? 1)
        : videoState.position;

      // Load video if we have a videoId
      if (videoState.videoId) {
        const currentVideoId = playerRef.current.getVideoData?.()?.video_id;

        if (currentVideoId !== videoState.videoId) {
          playerRef.current.loadVideoById({
            videoId: videoState.videoId,
            startSeconds: Math.max(0, effectivePos),
          });
        } else {
          // Same video, just sync position if needed
          const currentTime = playerRef.current.getCurrentTime?.() ?? 0;
          if (Math.abs(currentTime - effectivePos) > 2) {
            // 2 second tolerance
            playerRef.current.seekTo(effectivePos);
          }
        }
      }

      // Sync play/pause state - only if current state doesn't match desired state
      const currentPlayerState = playerRef.current.getPlayerState?.();
      const isCurrentlyPlaying =
        currentPlayerState === window.YT?.PlayerState.PLAYING;
      const isCurrentlyPaused =
        currentPlayerState === window.YT?.PlayerState.PAUSED;
      const isCurrentlyBuffering =
        currentPlayerState === window.YT?.PlayerState.BUFFERING;

      if (videoState.playerState === PlayerState.PLAYING && !isCurrentlyPlaying) {
        ensurePlayWithMuteFallback();
      } else if (videoState.playerState === PlayerState.PAUSED && !isCurrentlyPaused && !isCurrentlyBuffering) {
        playerRef.current.pauseVideo();
      }

      // Reset flag after YouTube processes the change
      setTimeout(() => {
        isUpdatingFromSocket.current = false;
      }, 100);
    }, 500);
  }, [videoState, connected]);

  // Helper function to ensure video plays (with mute fallback for autoplay policies)
  const ensurePlayWithMuteFallback = (): void => {
    if (!playerRef.current) {
      return;
    }

    try {
      playerRef.current.playVideo();
    } catch (error) {
      console.warn("Play video failed:", error);
    }

    // Fallback for autoplay policies
    setTimeout(() => {
      const state = playerRef.current?.getPlayerState?.();
      if (state !== window.YT?.PlayerState.PLAYING) {
        playerRef.current?.mute?.();
        playerRef.current?.playVideo?.();
        playerRef.current?.unMute?.();
      }
    }, 200);
  };

  // Create stable controls object
  const controls = useMemo((): VideoControls => {
    return {
      setVideo: (videoId: string) => {
        videoManagerRef.current?.setVideo(videoId);
      },
      play: (position: number) => {
        videoManagerRef.current?.play(position);
      },
      pause: (position: number) => {
        videoManagerRef.current?.pause(position);
      },
      seek: (position: number) => {
        videoManagerRef.current?.seek(position);
      },
    };
  }, []);

  // Expose controls and state via ref
  useImperativeHandle(
    ref,
    () => ({
      controls,
      videoState,
    }),
    [controls, videoState]
  );

  return (
    <div ref={mountRef} className="absolute inset-0" suppressHydrationWarning />
  );
});

export default Player;
