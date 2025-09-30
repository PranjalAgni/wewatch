"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import Player, { PlayerRef } from "@/components/Player";
import ClientOnly from "@/components/ClientOnly";
import UsernameModal from "@/components/UsernameModal";
import { parseYouTubeId } from "@/lib/youtube";
import { PlayerState } from "@/types/video";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import EmojiPickerComponent from "@/components/EmojiPicker";

// Helper function to get readable state name
function getPlayerStateName(state: PlayerState): string {
  switch (state) {
    case PlayerState.PLAYING:
      return "PLAYING";
    case PlayerState.PAUSED:
      return "PAUSED";
    case PlayerState.BUFFERING:
      return "BUFFERING";
    case PlayerState.ENDED:
      return "ENDED";
    case PlayerState.CUED:
      return "CUED";
    case PlayerState.UNSTARTED:
      return "UNSTARTED";
    default:
      return "UNKNOWN";
  }
}

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const [url, setUrl] = useState<string>("");
  const playerRef = useRef<PlayerRef>(null);
  const hasJoinedRef = useRef<boolean>(false);

  // Helper function for massive confetti explosion
  const triggerMuskConfetti = useCallback(() => {
    // First massive burst from center
    confetti({
      particleCount: 300,
      spread: 160,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57']
    });
    
    // Left side explosion
    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 140,
        origin: { x: 0.1, y: 0.5 },
        colors: ['#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43', '#10AC84']
      });
    }, 200);
    
    // Right side explosion  
    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 140,
        origin: { x: 0.9, y: 0.5 },
        colors: ['#FFA726', '#EC407A', '#AB47BC', '#42A5F5', '#26C6DA', '#66BB6A']
      });
    }, 400);
    
    // Final massive center burst
    setTimeout(() => {
      confetti({
        particleCount: 250,
        spread: 180,
        origin: { y: 0.3 },
        colors: ['#FFD700', '#FF1744', '#00E676', '#2196F3', '#FF9800', '#E91E63']
      });
    }, 600);
  }, []);

  // Username state - only set after user submits via modal
  const [username, setUsername] = useState<string>("");
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState<boolean>(true);
  const [connectedUsers, setConnectedUsers] = useState<
    Array<{ id: string; username: string }>
  >([]);
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      username: string;
      content: string;
      createdAt: string;
      replyToId?: string;
    }>
  >([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    username: string;
    content: string;
  } | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Hover state for reply buttons
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  // Handle username submission from modal
  const handleUsernameSubmit = useCallback((submittedUsername: string) => {
    setUsername(submittedUsername);
    setIsUsernameModalOpen(false);
  }, []);

  // Get socket connection with stable options - only when we have username
  const socketOptions = useMemo(
    () => ({
      transports: ["websocket"] as const,
    }),
    []
  );

  const { socket, connected } = useSocket(
    username ? process.env.NEXT_PUBLIC_SERVER_URL! : "",
    socketOptions
  );

  // Join room when connected (only once per connection)
  useEffect(() => {
    if (socket && connected && code && username && !hasJoinedRef.current) {
      socket.emit("join", { code, username });
      // Load chat history when joining room
      socket.emit("GET_CHATS", { code });
      // Get list of connected users
      socket.emit("GET_USERS", { code });
      hasJoinedRef.current = true;
      
      // Trigger confetti for self if username contains "musk"
      if (username.toLowerCase().includes("musk")) {
        // Small delay to let the UI settle, then trigger massive confetti
        setTimeout(() => {
          triggerMuskConfetti();
          // Show welcome toast for self
          toast.success(`Hello hello, ${username}! Looking good! 😏`, {
            description: "The room just got a whole lot more interesting 🫰🏻🫰🏻🫰🏻",
            duration: 4000,
          });
        }, 500);
      }
    }

    // Reset join flag when disconnected
    if (!connected) {
      hasJoinedRef.current = false;
    }
  }, [socket, connected, code, username, triggerMuskConfetti]);

  // Socket listeners for users list
  useEffect(() => {
    if (!socket) return;
    const handlePresence = (data: {
      type: "JOIN" | "LEAVE";
      username: string;
    }) => {
      if (data.type === "JOIN") {
        setConnectedUsers((prev) => {
          // Add the new user
          const updatedUsers = [
            ...prev,
            { id: Date.now().toString(), username: data.username },
          ];
          
          // Ensure current user is always at the beginning of the list
          const currentUserExists = updatedUsers.some(user => user.username === username);
          if (!currentUserExists && username) {
            updatedUsers.unshift({ 
              id: "self", 
              username: username 
            });
          }
          
          return updatedUsers;
        });
        
        // Musk easter egg - trigger MASSIVE confetti if username contains "musk"
        if (data.username.toLowerCase().includes("musk")) {
          triggerMuskConfetti();
        }
      } else {
        setConnectedUsers((prev) =>
          prev.filter((user) => user.username !== data.username)
        );
      }
    };

    const handleUsersList = (data: {
      users: Array<{ id: string; username: string }>;
    }) => {
      // Include current user in the list if not already present
      const allUsers = [...data.users];
      const currentUserExists = allUsers.some(user => user.username === username);
      
      if (!currentUserExists && username) {
        allUsers.unshift({ 
          id: "self", 
          username: username 
        });
      }
      
      setConnectedUsers(allUsers);
    };

    socket.on("PRESENCE", handlePresence);
    socket.on("USERS_LIST", handleUsersList);

    return () => {
      socket.off("PRESENCE", handlePresence);
      socket.off("USERS_LIST", handleUsersList);
    };
  }, [socket, username, triggerMuskConfetti]);

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
      setMessages((prev) => [...prev, message]);
      // Auto scroll to bottom when new message arrives
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop =
            chatContainerRef.current.scrollHeight;
        }
      }, 50);
    };

    const handleChatHistory = (
      chatMessages: Array<{
        id: string;
        username: string;
        content: string;
        createdAt: string;
        replyToId?: string;
      }>
    ) => {
      setMessages(chatMessages);
      // Auto scroll to bottom when history loads
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop =
            chatContainerRef.current.scrollHeight;
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
  const sendMessage = useCallback(
    (content: string) => {
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
    },
    [socket, code, username, replyingTo]
  );

  // Handle chat form submission
  const handleChatSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;

      sendMessage(chatInput);
      setChatInput("");
    },
    [chatInput, sendMessage]
  );

  // Start reply to a message
  const startReply = useCallback(
    (message: { id: string; username: string; content: string }) => {
      setReplyingTo(message);
    },
    []
  );

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Handle emoji insertion
  const handleEmojiSelect = useCallback((emoji: string) => {
    if (chatInputRef.current) {
      const input = chatInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      
      // Insert emoji at cursor position
      const newValue = chatInput.slice(0, start) + emoji + chatInput.slice(end);
      setChatInput(newValue);
      
      // Set cursor position after the inserted emoji
      const newCursorPos = start + emoji.length;
      
      // Focus input and set cursor position
      setTimeout(() => {
        if (input) {
          input.focus();
          input.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  }, [chatInput]);

  // Find original message for reply context
  const findOriginalMessage = useCallback(
    (replyToId: string) => {
      return messages.find((m) => m.id === replyToId);
    },
    [messages]
  );

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
      payload: { videoId: id },
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
      payload: { position: 0 },
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
      {/* Username Modal */}
      <UsernameModal
        isOpen={isUsernameModalOpen}
        onUsernameSubmit={handleUsernameSubmit}
        roomCode={code || ""}
      />

      {/* Show loading state if username not provided yet */}
      {!username ? (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-gray-300">Preparing room...</p>
          </div>
        </div>
      ) : (
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

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-3">
                {connectedUsers.length} watching
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {connectedUsers.map((user) => {
                  const isCurrentUser = user.username === username;
                  return (
                    <div key={user.id} className="flex flex-col items-center gap-1">
                      <Avatar className={`border-2 w-10 h-10 ${
                        isCurrentUser 
                          ? "border-green-400 ring-2 ring-green-400/30" 
                          : "border-gray-600"
                      }`}>
                        <AvatarFallback className={`text-white text-sm font-semibold ${
                          isCurrentUser 
                            ? "bg-gradient-to-br from-green-500 to-emerald-600" 
                            : "bg-gradient-to-br from-blue-500 to-purple-600"
                        }`}>
                          {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`text-xs max-w-[60px] truncate text-center ${
                        isCurrentUser ? "text-green-300 font-medium" : "text-gray-300"
                      }`} title={user.username}>
                        {isCurrentUser ? "You" : user.username}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {playerRef.current?.videoState && (
              <div className="mt-3 text-xs text-gray-400">
                snapshot: videoId={playerRef.current.videoState.videoId || "-"}{" "}
                | state=
                <span
                  className={
                    playerRef.current.videoState.playerState ===
                    PlayerState.PLAYING
                      ? "text-green-400"
                      : playerRef.current.videoState.playerState ===
                        PlayerState.PAUSED
                      ? "text-yellow-400"
                      : playerRef.current.videoState.playerState ===
                        PlayerState.BUFFERING
                      ? "text-blue-400"
                      : playerRef.current.videoState.playerState ===
                        PlayerState.ENDED
                      ? "text-red-400"
                      : "text-gray-400"
                  }
                >
                  {getPlayerStateName(playerRef.current.videoState.playerState)}
                </span>{" "}
                | pos=
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

              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-3 space-y-2"
              >
                {messages.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-4">
                    No messages yet. Be the first to say hello! 👋
                  </div>
                ) : (
                  messages.map((message) => {
                    const originalMessage = message.replyToId
                      ? findOriginalMessage(message.replyToId)
                      : null;
                    const isOwnMessage = message.username === username;

                    return (
                      <div key={message.id} className="space-y-1">
                        {/* Message container with hover */}
                        <div
                          className={`group flex ${
                            isOwnMessage ? "justify-end" : "justify-start"
                          } items-center gap-2`}
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
                              <svg
                                className="w-3 h-3 text-gray-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                />
                              </svg>
                            </button>
                          )}

                          {/* Message bubble - Quote-style for replies */}
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              isOwnMessage
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-100"
                            }`}
                          >
                            {!isOwnMessage && (
                              <div className="text-xs font-semibold text-gray-300 mb-1">
                                {message.username}
                              </div>
                            )}

                            {/* Quote block for replies - Compact */}
                            {originalMessage && (
                              <div
                                className={`mb-2 border-l-2 ${
                                  isOwnMessage
                                    ? "border-blue-400"
                                    : "border-gray-400"
                                } pl-2 py-1 ${
                                  isOwnMessage
                                    ? "bg-blue-800/30"
                                    : "bg-gray-800/40"
                                } rounded-r text-xs`}
                              >
                                <div
                                  className={`font-medium ${
                                    isOwnMessage
                                      ? "text-blue-300"
                                      : "text-gray-400"
                                  } text-[10px] mb-0.5`}
                                >
                                  {originalMessage.username}
                                </div>
                                <div
                                  className={`${
                                    isOwnMessage
                                      ? "text-blue-200"
                                      : "text-gray-300"
                                  } leading-tight opacity-90`}
                                >
                                  {originalMessage.content}
                                </div>
                              </div>
                            )}

                            <div className="text-sm break-words">
                              {message.content}
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              {new Date(message.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>

                          {/* Reply button for own messages (right side) */}
                          {isOwnMessage && hoveredMessageId === message.id && (
                            <button
                              onClick={() => startReply(message)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-600 hover:bg-gray-500 rounded-full p-1.5 z-10"
                              title="Reply to this message"
                            >
                              <svg
                                className="w-3 h-3 text-gray-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                />
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
                          <svg
                            className="w-4 h-4 text-blue-400 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                            />
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
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleChatSubmit}
                className="p-3 flex gap-2 border-t border-gray-800"
              >
                <div className="flex-1 flex gap-2">
                  <input
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="rounded-lg border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500 flex-1"
                    placeholder={
                      replyingTo
                        ? `Your reply to ${replyingTo.username}...`
                        : "Type a message…"
                    }
                    disabled={!connected || !username}
                  />
                  <EmojiPickerComponent 
                    onEmojiSelect={handleEmojiSelect}
                    disabled={!connected || !username}
                  />
                </div>
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
      )}
    </ClientOnly>
  );
}
