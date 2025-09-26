"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ClientOnly from "@/components/ClientOnly";

export default function Home() {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleCreateRoom = async () => {
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const response = await apiService.createRoom();
      console.log("Room created:", response);
      
      toast.success(`Room created! Code: ${response.roomCode}`);
      
      // Redirect to the room
      router.push(`/room/${response.roomCode}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ClientOnly>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-screen">
          <main className="text-center space-y-8 max-w-2xl">
            {/* Logo/Brand */}
            <div className="space-y-4">
              <h1 className="text-6xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                WeWatch
              </h1>
              <p className="text-xl text-gray-300">
                Watch videos together, synchronized and fun!
              </p>
            </div>

            {/* Description */}
            <div className="space-y-4 text-gray-200">
              <p className="text-lg">
                Create a room, invite your friends, and enjoy watching YouTube videos together in perfect sync.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl mb-2">🎬</div>
                  <h3 className="font-semibold">Synchronized Playback</h3>
                  <p className="text-sm text-gray-300">Everyone stays in perfect sync</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl mb-2">💬</div>
                  <h3 className="font-semibold">Live Chat</h3>
                  <p className="text-sm text-gray-300">Chat while you watch</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                  <div className="text-2xl mb-2">👥</div>
                  <h3 className="font-semibold">Room-based</h3>
                  <p className="text-sm text-gray-300">Private rooms for your group</p>
                </div>
              </div>
            </div>

            {/* Create Room Button */}
            <div className="pt-8">
              <Button
                onClick={handleCreateRoom}
                disabled={isCreating}
                size="lg"
                className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white border-0 shadow-lg transform transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Room...
                  </>
                ) : (
                  <>
                    🚀 Create a Room
                  </>
                )}
              </Button>
            </div>

            {/* Additional Info */}
            <div className="pt-8 text-sm text-gray-400">
              <p>No registration required • Completely free</p>
            </div>
          </main>
        </div>
      </div>
    </ClientOnly>
  );
}
