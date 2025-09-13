"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type Snapshot = {
  videoId?: string;
  isPlaying: boolean;
  position: number;
  rate: number;
  stampMs: number;
  seq: number;
};

export function useSocket(code: string, username: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!code) return;

    const url = process.env.NEXT_PUBLIC_SERVER_URL!;
    const s = io(url, { transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));

    // join room
    s.emit("join", { code, username });

    // listeners
    s.on("SNAPSHOT", (snap: Snapshot) => {
      setLastSnapshot(snap);
      // useful for Player later:
      // console.log("[socket] SNAPSHOT", snap);
    });

    // debug: see traffic
    s.on("PLAY", (p) => console.log("[socket] PLAY", p));
    s.on("PAUSE", (p) => console.log("[socket] PAUSE", p));
    s.on("SEEK", (p) => console.log("[socket] SEEK", p));
    s.on("SET_VIDEO", (p) => console.log("[socket] SET_VIDEO", p));
    s.on("CHAT", (m) => console.log("[socket] CHAT", m));
    s.on("PRESENCE", (p) => console.log("[socket] PRESENCE", p));

    return () => {
      s.off("SNAPSHOT");
      s.off("PLAY");
      s.off("PAUSE");
      s.off("SEEK");
      s.off("SET_VIDEO");
      s.off("CHAT");
      s.off("PRESENCE");
      s.disconnect();
    };
  }, [code, username]);

  return { socketRef, connected, lastSnapshot };
}
