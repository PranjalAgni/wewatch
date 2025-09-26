import databaseService from "../services/database.js";
import roomManager from "../services/roomManager.js";

export function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle room joining
    socket.on("join", async ({ code, username }) => {
      try {
        if (!code) {
          socket.emit("ERROR", { message: "Room code is required" });
          return;
        }

        // Validate room exists and is not expired
        const validation = await databaseService.isRoomValid(code);
        
        if (!validation.valid) {
          socket.emit("ERROR", { message: validation.reason });
          return;
        }

        // Room is valid, proceed with join
        socket.data.username = username || "Guest" + Date.now();
        socket.join(code);

        // Initialize room state if needed and send snapshot
        const roomState = roomManager.initializeRoom(code);
        socket.emit("SNAPSHOT", roomState);
        
        // Notify other users in the room
        socket.to(code).emit("PRESENCE", { 
          type: "JOIN", 
          username: socket.data.username 
        });

        console.log(`User ${socket.data.username} joined room ${code}`);
      } catch (error) {
        console.error("Failed to handle join:", error);
        socket.emit("ERROR", { message: "Failed to join room" });
      }
    });

    // Handle video control events
    socket.on("control", ({ code, type, payload }) => {
      try {
        const updatedPayload = roomManager.updateRoomState(code, type, payload);
        console.log("updatedPayload", updatedPayload);
        if (updatedPayload) {
          // Emit to ALL clients in the room (including sender)
          io.to(code).emit(type, updatedPayload);
          console.log(`Control event ${type} in room ${code}`);
        }
      } catch (error) {
        console.error("Failed to handle control event:", error);
        socket.emit("ERROR", { message: "Failed to process control event" });
      }
    });

    // Handle chat messages
    socket.on("chat", async ({ code, message }) => {
      try {
        if (!code || !message?.content) {
          return;
        }

        const username = message.username || socket.data.username || "Guest";
        const saved = await databaseService.createMessage(
          code,
          username,
          message.content,
          message.replyToId || null
        );

        // Broadcast message to all users in the room
        io.to(code).emit("CHAT", {
          id: saved.id,
          content: saved.content,
          username: saved.username,
          createdAt: saved.createdAt,
          replyToId: saved.replyToId,
        });

        console.log(`Chat message from ${username} in room ${code}`);
      } catch (error) {
        console.error("Failed to handle chat message:", error);
        socket.emit("ERROR", { message: "Failed to send message" });
      }
    });

    // Handle chat history requests
    socket.on("GET_CHATS", async ({ code }) => {
      try {
        if (!code) {
          return;
        }

        const messages = await databaseService.getMessageHistory(code);
        socket.emit("CHAT_HISTORY", messages);
        console.log(`Sent chat history for room ${code} to ${socket.id}`);
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
        socket.emit("ERROR", { message: "Failed to fetch chat history" });
      }
    });

    // Handle user disconnection
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("PRESENCE", { 
            type: "LEAVE", 
            username: socket.data.username 
          });
          console.log(`User ${socket.data.username} left room ${room}`);
        }
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
