import { Router } from "express";
import databaseService from "../services/database.js";
import roomManager from "../services/roomManager.js";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), date: Date.now().toString() });
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
