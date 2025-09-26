// Lean socket connection hook - only handles connection management
"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketOptions {
  transports?: readonly string[];
}

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
}

export function useSocket(url: string, options?: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  // Create stable reference for transports array to prevent unnecessary re-connections
  const transports = useMemo(() => 
    options?.transports ? [...options.transports] : ["websocket"], 
    [options?.transports]
  );

  useEffect(() => {
    if (!url) {
      return;
    }

    const socket: Socket = io(url, {
      transports,
      timeout: 5000, // 5 second connection timeout
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("Disconnected:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Connection error:", error);
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [url, transports]);

  return { 
    socket: socketRef.current, 
    connected
  };
}
