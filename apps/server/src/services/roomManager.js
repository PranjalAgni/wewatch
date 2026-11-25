import { randomBytes } from "crypto";

class RoomManager {
  constructor() {
    // In-memory snapshot per room: code -> { videoId, playerState, position, rate, stampMs, seq, videosHistory, currentVideoTime }
    this.rooms = new Map();
  }

  // Helper function to generate secure room codes
  generateRoomCode() {
    const buffer = randomBytes(6);
    const code = buffer.toString('hex').toUpperCase();
    return code.substring(0, 8); // 8-character room code
  }

  // Get current timestamp
  now() {
    return Date.now();
  }

  // Initialize room state if it doesn't exist
  initializeRoom(code) {
    if (!this.rooms.has(code)) {
      this.rooms.set(code, {
        videoId: "",
        playerState: -1, // UNSTARTED
        position: 0,
        rate: 1,
        stampMs: this.now(),
        seq: 0,
        videosHistory: [],
        currentVideoTime: 0
      });
    }
    return this.rooms.get(code);
  }

  // Get room state
  getRoomState(code) {
    return this.rooms.get(code);
  }

  // Update room state based on control events
  updateRoomState(code, type, payload) {
    const state = this.rooms.get(code);
    if (!state) return null;

    const timestamp = this.now();

    switch (type) {
      case "SET_VIDEO": {
        if (!/^[A-Za-z0-9_-]{11}$/.test(payload?.videoId ?? "")) return null;
        // A new video always starts from the beginning and plays for everyone.
        state.videoId = payload.videoId;
        state.playerState = 1; // PLAYING
        state.position = 0;
        state.stampMs = timestamp;
        state.seq = (state.seq || 0) + 1;
        return {
          videoId: state.videoId,
          playerState: state.playerState,
          position: 0,
          at: timestamp,
          seq: state.seq,
        };
      }
      case "PLAY":
        state.playerState = 1; // PLAYING
        state.position = payload.position;
        state.stampMs = timestamp;
        break;
      case "PAUSE":
        state.playerState = 2; // PAUSED
        state.position = payload.position;
        state.stampMs = timestamp;
        break;
      case "SEEK":
        state.position = payload.position;
        state.stampMs = timestamp;
        break;
      case "RATE":
        state.rate = payload.rate;
        state.stampMs = timestamp;
        break;
    }

    state.seq = (state.seq || 0) + 1;
    return { ...payload, at: timestamp, seq: state.seq };
  }

  // Remove room (for cleanup)
  removeRoom(code) {
    return this.rooms.delete(code);
  }

  // Get all room codes (for debugging/monitoring)
  getAllRoomCodes() {
    return Array.from(this.rooms.keys());
  }
}

export default new RoomManager();
