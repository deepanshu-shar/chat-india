const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const mongoose = require("mongoose");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// MongoDB connect karo
mongoose.connect(process.env.MONGODB_URI || "your_mongodb_uri_here");

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user-online", async (userId) => {
      onlineUsers.set(userId, socket.id);
      await mongoose.connection.collection("users").updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { $set: { isOnline: true } }
      );
      io.emit("user-status-change", { userId, isOnline: true });
    });

    socket.on("join-room", (conversationId) => {
      socket.join(conversationId);
    });

    socket.on("send-message", (data) => {
      io.to(data.conversationId).emit("receive-message", data.message);
    });

    socket.on("disconnect", async () => {
      onlineUsers.forEach(async (socketId, userId) => {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          await mongoose.connection.collection("users").updateOne(
            { _id: new mongoose.Types.ObjectId(userId) },
            { $set: { isOnline: false, lastSeen: new Date() } }
          );
          io.emit("user-status-change", { userId, isOnline: false });
        }
      });
    });
  });

  httpServer.listen(3000, () => {
    console.log("Server chal raha hai http://localhost:3000");
  });
});