import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = Number(process.env.PORT || 3001);
const allow = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.statusCode = 200;
    res.end("ok");
    return;
  }
  res.statusCode = 404;
  res.end("not found");
});

const io = new Server(httpServer, {
  cors: { origin: allow.length ? allow : ["http://localhost:3000"] },
});

// Minimal in-memory snapshot per room
const rooms = new Map(); // code -> { videoId,isPlaying,position,rate,stampMs,seq }
const now = () => Date.now();

io.on("connection", (socket) => {
  socket.on("join", ({ code, username }) => {
    if (!code) return;
    socket.data.username = username || "Guest";
    socket.join(code);

    if (!rooms.has(code)) {
      rooms.set(code, {
        videoId: "",
        isPlaying: false,
        position: 0,
        rate: 1,
        stampMs: now(),
        seq: 0,
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
    if (type === "SET_VIDEO") s.videoId = payload.videoId;
    if (type === "PLAY") {
      s.isPlaying = true;
      s.position = payload.position;
      s.stampMs = t;
    }
    if (type === "PAUSE") {
      s.isPlaying = false;
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
    io.to(code).emit(type, { ...payload, at: t, seq: s.seq });
  });

  socket.on("chat", ({ code, message }) => {
    io.to(code).emit("CHAT", { ...message, at: now() });
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
