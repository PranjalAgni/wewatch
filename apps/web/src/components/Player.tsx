/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    _ytLoaded?: boolean;
  }
}

type Props = {
  code: string;
  connected: boolean;
  sockRef: React.MutableRefObject<any>;
  canControl?: boolean;
};

export default function Player({
  code,
  sockRef,
  connected,
  canControl = true,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Load the YT IFrame API once
  useEffect(() => {
    if (!window._ytLoaded) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window._ytLoaded = true;
      window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube IFrame API ready");
        /* no-op; we poll below */
      };
    }
  }, []);

  // Create player when API is ready
  useEffect(() => {
    function emit(type: string, payload: any) {
      sockRef.current?.emit("control", { code, type, payload });
    }

    const id = setInterval(() => {
      if (window.YT?.Player && mountRef.current && !playerRef.current) {
        playerRef.current = new window.YT.Player(mountRef.current, {
          videoId: "",
          playerVars: {
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onStateChange: (e: any) => {
              if (!canControl) return;
              const t = safeTime();
              if (e.data === window.YT.PlayerState.PLAYING) {
                emit("PLAY", { position: t });
              }

              if (e.data === window.YT.PlayerState.PAUSED) {
                emit("PAUSE", { position: t });
              }
            },
          },
        });
      }
    }, 100);
    return () => clearInterval(id);
  }, [canControl, code, sockRef]);

  // Socket listeners
  useEffect(() => {
    if (!connected) return;
    const s = sockRef.current;
    if (!s) return;

    function correct(target: number, tol = 0.3) {
      const cur = safeTime();
      if (Math.abs(cur - target) > tol)
        playerRef.current?.seekTo?.(target, true);
    }

    const onSnapshot = (st: any) => {
      if (st.videoId) playerRef.current?.cueVideoById(st.videoId);
      const pos = st.isPlaying
        ? st.position + ((Date.now() - st.stampMs) / 1000) * (st.rate ?? 1)
        : st.position;
      correct(pos);

      if (st.isPlaying) {
        playerRef.current?.playVideo();
      } else {
        playerRef.current?.pauseVideo();
      }
    };

    const onSetVideo = ({ videoId }: any) => {
      playerRef.current?.loadVideoById(videoId);
    };

    const onPlay = ({ position, at }: any) => {
      correct(position + (Date.now() - at) / 1000);
      playerRef.current?.playVideo();
    };

    const onPause = ({ position }: any) => {
      correct(position);
      playerRef.current?.pauseVideo();
    };

    const onSeek = ({ position }: any) => {
      correct(position);
    };

    s.on("SNAPSHOT", onSnapshot);
    s.on("SET_VIDEO", onSetVideo);
    s.on("PLAY", onPlay);
    s.on("PAUSE", onPause);
    s.on("SEEK", onSeek);

    return () => {
      s.off("SNAPSHOT", onSnapshot);
      s.off("SET_VIDEO", onSetVideo);
      s.off("PLAY", onPlay);
      s.off("PAUSE", onPause);
      s.off("SEEK", onSeek);
    };
  }, [sockRef, connected]);

  function safeTime(): number {
    try {
      return playerRef.current?.getCurrentTime?.() ?? 0;
    } catch {
      return 0;
    }
  }

  // Expose helpers through data-attrs if you ever need them
  return <div ref={mountRef} className="absolute inset-0" />;
}
