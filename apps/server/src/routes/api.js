import { Router } from "express";
import databaseService from "../services/database.js";
import roomManager from "../services/roomManager.js";
import { searchVideos, YouTubeSearchError } from "../services/youtube.js";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), date: Date.now().toString() });
});

// YouTube video search: GET /api/youtube/search?q=...
router.get("/youtube/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2 || q.length > 100) {
    return res.status(400).json({ error: "Query must be 2-100 characters" });
  }
  try {
    res.json({ results: await searchVideos(q) });
  } catch (error) {
    const status = error instanceof YouTubeSearchError ? error.statusCode : 500;
    if (status === 500) console.error("YouTube search error:", error);
    res.status(status).json({ error: error.message });
  }
});

// Room creation endpoint
router.post("/room/create", async (req, res) => {
  try {
    let roomCode;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique room code (retry if collision)
    do {
      roomCode = roomManager.generateRoomCode();
      attempts++;
      
      if (attempts > maxAttempts) {
        return res.status(500).json({ 
          error: "Failed to generate unique room code" 
        });
      }

      // Check if code already exists in database
      const existingRoom = await databaseService.findRoomByCode(roomCode);
      if (!existingRoom) break;
    } while (true);

    // Create room in database
    const room = await databaseService.createRoom(roomCode);

    // Return room details
    res.json({
      roomCode: room.code,
      inviteUrl: `${req.get('origin') || 'http://localhost:3000'}/room/${room.code}`,
      expiresAt: room.expiresAt
    });
    
  } catch (error) {
    console.error("Failed to create room:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// Get room info endpoint (optional - for debugging/monitoring)
router.get("/room/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const validation = await databaseService.isRoomValid(code);
    
    if (!validation.valid) {
      return res.status(404).json({ error: validation.reason });
    }

    const roomState = roomManager.getRoomState(code);
    
    res.json({
      room: validation.room,
      state: roomState || null
    });
  } catch (error) {
    console.error("Failed to get room info:", error);
    res.status(500).json({ error: "Failed to get room info" });
  }
});

export default router;
