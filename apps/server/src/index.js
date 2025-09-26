import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PORT = Number(process.env.PORT || 3001);
const allow = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const httpServer = createServer((req, res) => {
  // Add CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  
  if (req.url === "/health") {
    res.statusCode = 200;
    res.end("ok");
    return;
  }
  res.statusCode = 404;
  res.end("not found");
});

const io = new Server(httpServer, {
  cors: { 
    origin: allow.length ? allow : "*",
    methods: ["GET", "POST"],
    credentials: false
  },
});

// Minimal in-memory snapshot per room
const rooms = new Map(); // code -> { videoId,isPlaying,position,rate,stampMs,seq }
const now = () => Date.now();

io.on("connection", (socket) => {
  socket.on("join", ({ code, username }) => {
    if (!code) return;
    socket.data.username = username || "Guest" + Date.now();
    socket.join(code);

    if (!rooms.has(code)) {
      rooms.set(code, {
        videoId: "",
        playerState: -1, // UNSTARTED
        position: 0,
        rate: 1,
        stampMs: now(),
        seq: 0,
        videosHistory: [],
        currentVideoTime: 0
      });
    }
    socket.emit("SNAPSHOT", rooms.get(code));
    socket
      .to(code)
      .emit("PRESENCE", { type: "JOIN", username: socket.data.username });
  });

  socket.on("control", ({ code, type, payload }) => {
    const s = rooms.get(code);
    if (!s) return;
    const t = now();
    if (type === "SET_VIDEO") {
      s.videoId = payload.videoId;
      s.playerState = 5; // CUED
    }
    if (type === "PLAY") {
      s.playerState = 1; // PLAYING
      s.position = payload.position;
      s.stampMs = t;
    }
    if (type === "PAUSE") {
      s.playerState = 2; // PAUSED
      s.position = payload.position;
      s.stampMs = t;
    }
    if (type === "SEEK") {
      s.position = payload.position;
      s.stampMs = t;
    }
    if (type === "RATE") {
      s.rate = payload.rate;
      s.stampMs = t;
    }
    s.seq = (s.seq || 0) + 1;
    // Emit to ALL clients in the room (including sender)
    io.to(code).emit(type, { ...payload, at: t, seq: s.seq });
  });


  socket.on("chat", async ({ code, message }) => {
    if (!code || !message?.content) return;
  
    try {
      const saved = await prisma.message.create({
        data: {
          code,
          username: message.username || socket.data.username || "Guest",
          content: message.content,
          replyToId: message.replyToId || null, // ✅ Now storing replyToId
        },
      });
  
      io.to(code).emit("CHAT", {
        id: saved.id,
        content: saved.content,
        username: saved.username,
        createdAt: saved.createdAt,
        replyToId: saved.replyToId, // ✅ Now sending replyToId back to clients
      });
    } catch (error) {
      console.error("Failed to save chat message:", error);
    }
  });

  socket.on("GET_CHATS", async ({ code }) => {
    if (!code) return;
  
    try {
      const messages = await prisma.message.findMany({
        where: { code },
        orderBy: { createdAt: "asc" },
        take: 50, // limit to last 50 messages
      });
  
      socket.emit("CHAT_HISTORY", messages);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  });


  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id)
        socket
          .to(room)
          .emit("PRESENCE", { type: "LEAVE", username: socket.data.username });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(
    `[server] listening on http://localhost:${PORT}  CORS: ${
      allow.join(", ") || "http://localhost:3000"
    }`
  );
});
