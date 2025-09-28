import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

// Import our organized modules
import apiRoutes from "./routes/api.js";
import { setupSocketHandlers } from "./handlers/socketHandlers.js";
import { errorHandler, requestLogger, notFoundHandler } from "./middleware/errorHandler.js";
import databaseService from "./services/database.js";

// Configuration
const PORT = Number(process.env.PORT || 4000);
const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Create Express app
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS setup
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// Request logging (optional - can be disabled in production)
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger);
}

// API routes
app.use("/api", apiRoutes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Create HTTP server with Express app
const httpServer = createServer(app);

// Setup Socket.IO
const io = new Server(httpServer, {
  cors: { 
    origin: corsOrigins.length ? corsOrigins : "*",
    methods: ["GET", "POST"],
    credentials: false
  },
});

// Setup socket event handlers
setupSocketHandlers(io);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await databaseService.disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await databaseService.disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(
    `[server] listening on http://localhost:${PORT}  CORS: ${
      corsOrigins.join(", ") || "*"
    }`
  );
});
