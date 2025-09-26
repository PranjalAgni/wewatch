"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface UsernameModalProps {
  isOpen: boolean;
  onUsernameSubmit: (username: string) => void;
  roomCode: string;
}

export default function UsernameModal({ isOpen, onUsernameSubmit, roomCode }: UsernameModalProps) {
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    const finalUsername = username.trim();
    onUsernameSubmit(finalUsername);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold text-white">
            Welcome to WeWatch!
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            You&apos;re joining room <span className="font-mono font-semibold text-purple-400">{roomCode}</span>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-gray-300">
              Pick a nickname
            </label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
              maxLength={20}
              autoFocus
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-4">
            <Button
              type="submit"
              disabled={!username.trim() || isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining Room...
                </>
              ) : (
                "Join the Room"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
