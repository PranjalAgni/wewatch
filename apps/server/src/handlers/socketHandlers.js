import databaseService from "../services/database.js";
import roomManager from "../services/roomManager.js";

const CONTROL_TYPES = new Set(["SET_VIDEO", "PLAY", "PAUSE", "SEEK", "RATE"]);

// Users currently connected to a room, as { id, username }.
function listRoomUsers(io, code) {
  const users = [];
  for (const socketId of io.sockets.adapter.rooms.get(code) ?? []) {
    const member = io.sockets.sockets.get(socketId);
    if (member?.data?.roomCode === code) {
      users.push({ id: socketId, username: member.data.username });
    }
  }
  return users;
}

export function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    // A socket may act on a room only after a successful "join" for that room.
    const isMember = (code) => Boolean(code) && socket.data.roomCode === code;
    const rejectNonMember = () =>
      socket.emit("ERROR", { message: "Join the room first" });
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

        // A socket belongs to one room at a time
        const previous = socket.data.roomCode;
        if (previous && previous !== code) {
          socket.leave(previous);
          socket.to(previous).emit("PRESENCE", { type: "LEAVE", username: socket.data.username });
        }

        // Room is valid, proceed with join
        socket.data.username = username || "Guest" + Date.now();
        socket.data.roomCode = code;
        socket.join(code);

        // Send the joiner everything it needs, after membership is established
        const roomState = roomManager.initializeRoom(code);
        socket.emit("SNAPSHOT", roomState);
        socket.emit("USERS_LIST", { users: listRoomUsers(io, code) });
        socket.emit("CHAT_HISTORY", await databaseService.getMessageHistory(code));

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
    socket.on("control", ({ code, type, payload } = {}) => {
      if (!isMember(code)) return rejectNonMember();
      if (!CONTROL_TYPES.has(type)) return;
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
    socket.on("chat", async ({ code, message } = {}) => {
      if (!isMember(code)) return rejectNonMember();
      try {
        if (!message?.content) {
          return;
        }

        // Always the name the sender joined with, never a client-supplied one
        const username = socket.data.username;
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
    socket.on("GET_CHATS", async ({ code } = {}) => {
      if (!isMember(code)) return rejectNonMember();
      try {
        const messages = await databaseService.getMessageHistory(code);
        socket.emit("CHAT_HISTORY", messages);
        console.log(`Sent chat history for room ${code} to ${socket.id}`);
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
        socket.emit("ERROR", { message: "Failed to fetch chat history" });
      }
    });

    socket.on("GET_USERS", ({ code } = {}) => {
      if (!isMember(code)) return rejectNonMember();
      socket.emit("USERS_LIST", { users: listRoomUsers(io, code) });
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
