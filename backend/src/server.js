require("dotenv").config();

const http = require("http");
const WebSocket = require("ws");
const app = require("./app");
const connectDB = require("./config/db");
const createSuperAdmin = require("./utils/createSuperAdmin");

const startServer = async () => {
  try {
    await connectDB();

    // Default Super Admin create karega
    await createSuperAdmin();

    // Start background cron scheduler
    const { runScheduler } = require("./utils/cronJobs");
    runScheduler();

    const PORT = process.env.PORT || 5000;

    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });

    wss.on("connection", (ws) => {
      console.log("🔌 WebSocket client connected");

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("📩 Received WebSocket message:", data);

          // Broadcast to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      });

      ws.on("close", () => {
        console.log("❌ WebSocket client disconnected");
      });
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
};

startServer();