"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import Player from "@/components/Player";
import { parseYouTubeId } from "@/lib/youtube";

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const [username, setUsername] = useState("Guest" + Date.now());
  const [url, setUrl] = useState("");

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("username") : null;
    if (saved) setUsername(saved);
  }, []);

  const { socketRef, connected, lastSnapshot } = useSocket(code, username);

  function sendTestChat() {
    socketRef.current?.emit("chat", {
      code,
      message: {
        username,
        text: "Hello from " + username,
        createdAt: new Date().toISOString(),
      },
    });
  }

  function submitVideo(e: React.FormEvent) {
    e.preventDefault();
    const id = parseYouTubeId(url);
    if (!id) return;

    // 1) load video everywhere
    socketRef.current?.emit("control", {
      code,
      type: "SET_VIDEO",
      payload: { videoId: id },
    });

    setUrl("");
  }

  function restartVideo() {
    socketRef.current?.emit("control", {
      code,
      type: "SEEK",
      payload: { position: 0 },
    });
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] h-screen">
      {/* Left: Video */}
      <section className="p-3 overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm">
            Room: <span className="font-mono">{code}</span>{" "}
            <span className={connected ? "text-green-500" : "text-red-500"}>
              {connected ? "● connected" : "● disconnected"}
            </span>
          </div>
          <button
            onClick={sendTestChat}
            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700"
          >
            Send test chat
          </button>
        </div>

        <div className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow">
          <Player
            code={code}
            sockRef={socketRef}
            connected={connected}
            canControl
          />
        </div>

        <form onSubmit={submitVideo} className="mt-3 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rounded-lg border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 flex-1"
            placeholder="Paste YouTube URL or ID"
          />
          <button className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700">
            Set Video
          </button>
          <button
            type="button"
            onClick={restartVideo}
            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700"
          >
            ↺ Restart
          </button>
        </form>

        {lastSnapshot && (
          <div className="mt-3 text-xs text-gray-400">
            snapshot: videoId={lastSnapshot.videoId || "-"} | playing=
            {String(lastSnapshot.isPlaying)} | pos=
            {lastSnapshot.position.toFixed(2)}s
          </div>
        )}
      </section>

      {/* Right: Chat… (unchanged) */}
      <aside className="hidden lg:block border-l border-gray-800 bg-gray-900">
        <div className="sticky top-0 h-screen flex flex-col">
          <header className="p-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-200">Chat</h3>
          </header>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-sm text-gray-400">
              Hooked to server: {connected ? "yes" : "no"}. Open this room in a
              second tab and click “Send test chat”.
            </div>
          </div>

          <form className="p-3 flex gap-2 border-t border-gray-800">
            <input
              className="rounded-lg border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 flex-1"
              placeholder="Type a message…"
            />
            <button className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700">
              Send
            </button>
          </form>
        </div>
      </aside>
    </main>
  );
}
