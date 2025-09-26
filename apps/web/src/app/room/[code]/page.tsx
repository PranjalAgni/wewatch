"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import Player, { PlayerRef } from "@/components/Player";
import ClientOnly from "@/components/ClientOnly";
import { parseYouTubeId } from "@/lib/youtube";
import { PlayerState } from "@/types/video";

// Helper function to get readable state name
function getPlayerStateName(state: PlayerState): string {
  switch (state) {
    case PlayerState.PLAYING: return "PLAYING";
    case PlayerState.PAUSED: return "PAUSED";
    case PlayerState.BUFFERING: return "BUFFERING";
    case PlayerState.ENDED: return "ENDED";
    case PlayerState.CUED: return "CUED";
    case PlayerState.UNSTARTED: return "UNSTARTED";
    default: return "UNKNOWN";
  }
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const [url, setUrl] = useState<string>("");
  const playerRef = useRef<PlayerRef>(null);
  const hasJoinedRef = useRef<boolean>(false);

  // Initialize username - will be set after component mounts
  const [username, setUsername] = useState<string>("");
  const [hasPrompted, setHasPrompted] = useState<boolean>(false);

  // Chat state
  const [messages, setMessages] = useState<Array<{
    id: string;
    username: string;
    content: string;
    createdAt: string;
    replyToId?: string;
  }>>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    username: string;
    content: string;
  } | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Hover state for reply buttons
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Prompt for username after component mounts to avoid hydration errors
  useEffect(() => {
    if (typeof window !== "undefined" && !hasPrompted) {
      const promptedName = prompt("Enter your username:") || `Guest${Math.floor(Math.random() * 10000)}`;
      setUsername(promptedName);
      setHasPrompted(true);
    }
  }, [hasPrompted]);

  // Get socket connection with stable options
  const socketOptions = useMemo(() => ({
    transports: ["websocket"] as const,
  }), []);
  
  const { socket, connected } = useSocket(process.env.NEXT_PUBLIC_SERVER_URL!, socketOptions);

  // Join room when connected (only once per connection)
  useEffect(() => {
    if (socket && connected && code && username && !hasJoinedRef.current) {
      socket.emit("join", { code, username });
      // Load chat history when joining room
      socket.emit("GET_CHATS", { code });
      hasJoinedRef.current = true;
    }

    // Reset join flag when disconnected
    if (!connected) {
      hasJoinedRef.current = false;
    }
  }, [socket, connected, code, username]);

  // Socket listeners for chat events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: {
      id: string;
      username: string;
      content: string;
      createdAt: string;
      replyToId?: string;
    }) => {
      setMessages(prev => [...prev, message]);
      // Auto scroll to bottom when new message arrives
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 50);
    };

    const handleChatHistory = (chatMessages: Array<{
      id: string;
      username: string;
      content: string;
      createdAt: string;
      replyToId?: string;
    }>) => {
      setMessages(chatMessages);
      // Auto scroll to bottom when history loads
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    };

    socket.on("CHAT", handleNewMessage);
    socket.on("CHAT_HISTORY", handleChatHistory);

    return () => {
      socket.off("CHAT", handleNewMessage);
      socket.off("CHAT_HISTORY", handleChatHistory);
    };
  }, [socket]);

  // Send chat message
  const sendMessage = useCallback((content: string) => {
    if (!socket || !code || !username || !content.trim()) {
      return;
    }

    socket.emit("chat", {
      code,
      message: {
        username,
        content: content.trim(),
        replyToId: replyingTo?.id,
      },
    });

    // Clear reply state after sending
    setReplyingTo(null);
  }, [socket, code, username, replyingTo]);

  // Handle chat form submission
  const handleChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    sendMessage(chatInput);
    setChatInput("");
  }, [chatInput, sendMessage]);

  // Start reply to a message
  const startReply = useCallback((message: { id: string; username: string; content: string }) => {
    setReplyingTo(message);
  }, []);

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Find original message for reply context
  const findOriginalMessage = useCallback((replyToId: string) => {
    return messages.find(m => m.id === replyToId);
  }, [messages]);


  function sendTestChat(): void {
    if (!socket || !code || !username) {
      return;
    }

    sendMessage("Hello from " + username + " (test)");
  }

  function submitVideo(e: React.FormEvent): void {
    e.preventDefault();
    
    const id = parseYouTubeId(url);
    if (!id || !socket || !code) {
      return;
    }

    // Emit socket event to server, which will broadcast to all clients
    socket.emit("control", {
      code,
      type: "SET_VIDEO",
      payload: { videoId: id }
    });
    setUrl("");
  }

  function restartVideo(): void {
    if (!socket || !code) {
      return;
    }

    // Emit socket event to server to seek to beginning
    socket.emit("control", {
      code,
      type: "SEEK",
      payload: { position: 0 }
    });
  }

  return (
    <ClientOnly
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading room...</p>
          </div>
        </div>
      }
    >
      <main className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] h-screen">
        {/* Left: Video */}
        <section className="p-3 overflow-y-auto">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm">
            Room: <span className="font-mono">{code}</span>{" "}
            <span className={connected ? "text-green-500" : "text-red-500"}>
              {connected ? "● connected" : "● disconnected"}
            </span>
            {username && (
              <>
                {" | "}
                User: <span className="font-semibold">{username}</span>
              </>
            )}
          </div>
          <button
            onClick={sendTestChat}
            disabled={!username}
            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send test chat
          </button>
        </div>

        <div className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow">
          <Player
            ref={playerRef}
            socket={socket}
            connected={connected}
            roomCode={code}
            canControl={true}
          />
        </div>

        <form onSubmit={submitVideo} className="mt-3 flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rounded-lg border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 flex-1"
            placeholder="Paste YouTube URL or ID"
          />
          <button 
            type="submit"
            disabled={!socket || !connected}
            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Video
          </button>
          <button
            type="button"
            onClick={restartVideo}
            disabled={!socket || !connected}
            className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ↺ Restart
          </button>
        </form>

        {playerRef.current?.videoState && (
          <div className="mt-3 text-xs text-gray-400">
            snapshot: videoId={playerRef.current.videoState.videoId || "-"} | state=
            <span className={
              playerRef.current.videoState.playerState === PlayerState.PLAYING ? "text-green-400" :
              playerRef.current.videoState.playerState === PlayerState.PAUSED ? "text-yellow-400" :
              playerRef.current.videoState.playerState === PlayerState.BUFFERING ? "text-blue-400" :
              playerRef.current.videoState.playerState === PlayerState.ENDED ? "text-red-400" :
              "text-gray-400"
            }>
              {getPlayerStateName(playerRef.current.videoState.playerState)}
            </span> | pos=
            {playerRef.current.videoState.position.toFixed(2)}s
          </div>
        )}
      </section>

      {/* Right: Chat */}
      <aside className="hidden lg:block border-l border-gray-800 bg-gray-900">
        <div className="sticky top-0 h-screen flex flex-col">
          <header className="p-3 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-200">Chat</h3>
          </header>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">
                No messages yet. Be the first to say hello! 👋
              </div>
            ) : (
              messages.map((message) => {
                const originalMessage = message.replyToId ? findOriginalMessage(message.replyToId) : null;
                const isOwnMessage = message.username === username;
                
                return (
                  <div key={message.id} className="space-y-1">
                    
                    {/* Message container with hover */}
                    <div 
                      className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-center gap-2`}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      {/* Reply button for other messages (left side) */}
                      {!isOwnMessage && hoveredMessageId === message.id && (
                        <button
                          onClick={() => startReply(message)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-600 hover:bg-gray-500 rounded-full p-1.5 z-10"
                          title="Reply to this message"
                        >
                          <svg className="w-3 h-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Message bubble - Quote-style for replies */}
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isOwnMessage 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-100'
                      }`}>
                        {!isOwnMessage && (
                          <div className="text-xs font-semibold text-gray-300 mb-1">
                            {message.username}
                          </div>
                        )}
                        
                        {/* Quote block for replies - Compact */}
                        {originalMessage && (
                          <div className={`mb-2 border-l-2 ${
                            isOwnMessage ? 'border-blue-400' : 'border-gray-400'
                          } pl-2 py-1 ${
                            isOwnMessage ? 'bg-blue-800/30' : 'bg-gray-800/40'
                          } rounded-r text-xs`}>
                            <div className={`font-medium ${
                              isOwnMessage ? 'text-blue-300' : 'text-gray-400'
                            } text-[10px] mb-0.5`}>
                              {originalMessage.username}
                            </div>
                            <div className={`${
                              isOwnMessage ? 'text-blue-200' : 'text-gray-300'
                            } leading-tight opacity-90`}>
                              {originalMessage.content}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-sm break-words">
                          {message.content}
                        </div>
                        <div className="text-xs opacity-75 mt-1">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      {/* Reply button for own messages (right side) */}
                      {isOwnMessage && hoveredMessageId === message.id && (
                        <button
                          onClick={() => startReply(message)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-600 hover:bg-gray-500 rounded-full p-1.5 z-10"
                          title="Reply to this message"
                        >
                          <svg className="w-3 h-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply context - Show parent message when replying */}
          {replyingTo && (
            <div className="border-t border-gray-700 bg-gray-850">
              {/* Parent message display */}
              <div className="px-3 py-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <svg className="w-4 h-4 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span className="text-sm font-medium text-blue-400">
                        Replying to {replyingTo.username}
                      </span>
                    </div>
                    <div className="bg-gray-700 rounded-lg px-3 py-2 border-l-4 border-blue-500">
                      <div className="text-sm text-gray-200 leading-relaxed">
                        {replyingTo.content}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={cancelReply}
                    className="text-gray-400 hover:text-gray-200 ml-3 p-1 hover:bg-gray-700 rounded"
                    title="Cancel reply"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleChatSubmit} className="p-3 flex gap-2 border-t border-gray-800">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="rounded-lg border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 flex-1"
              placeholder={replyingTo ? `Your reply to ${replyingTo.username}...` : "Type a message…"}
              disabled={!connected || !username}
            />
            <button 
              type="submit"
              disabled={!connected || !username || !chatInput.trim()}
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </aside>
    </main>
    </ClientOnly>
  );
}
