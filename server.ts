import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  // Socket.io logic for WebRTC signaling
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId: string, userId: string) => {
      socket.join(roomId);
      console.log(`User ${userId} joined room ${roomId}`);
      
      // Notify others in the room
      socket.to(roomId).emit("user-connected", userId);

      socket.on("disconnect", () => {
        console.log("User disconnected:", userId);
        socket.to(roomId).emit("user-disconnected", userId);
      });
    });

    // WebRTC Signaling
    socket.on("signal", (data: { to: string; from: string; signal: any }) => {
      io.to(data.to).emit("signal", {
        from: data.from,
        signal: data.signal,
      });
    });

    // Chat messages
    socket.on("send-message", (data: { roomId: string; message: any }) => {
      io.to(data.roomId).emit("receive-message", data.message);
    });

    // Raise hand
    socket.on("raise-hand", (data: { roomId: string; userId: string; isRaised: boolean }) => {
      io.to(data.roomId).emit("user-raised-hand", data);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
