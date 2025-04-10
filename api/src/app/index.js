import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";
import pool from "../models/index.js";

const PORT = process.env.PORT || 3000;
const app = express();

app.use(bodyParser.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

const server = http.createServer(app);
const SHUTDOWN_TIMEOUT = 3000;
const GRACEFUL_SHUTDOWN_HEADER = "x-graceful-shutdown";

// WebSocket server configuration
const wss = new WebSocketServer({
  server,
  path: "/",
  perMessageDeflate: false,
  clientTracking: true,
  handleProtocols: true,
  backlog: 100,
  maxPayload: 50 * 1024 * 1024,
  handleUpgrade: true, // Let WSS handle upgrades automatically
  skipUTF8Validation: false,
});

const PING_INTERVAL = 30000; // 30 seconds

// Set up the ping interval
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log("Terminating inactive connection");
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, PING_INTERVAL);

// Clear interval on server shutdown
wss.on("close", () => {
  clearInterval(pingInterval);
});

const connections = new Map(); // Store active connections by user ID

// Add periodic logging of connected users
const CONNECTION_LOG_INTERVAL = 30000; // 30 seconds
const connectionLogInterval = setInterval(() => {
  const connectedUsers = Array.from(connections.keys());
  console.log("\n=== Connected Users ===");
  console.log(`Total connections: ${connectedUsers.length}`);
  console.log("User IDs:", connectedUsers.sort((a, b) => a - b).join(", "));
  console.log("=====================\n");
}, CONNECTION_LOG_INTERVAL);

const queries = {
  createConversation: "INSERT INTO conversations(name) VALUES($1) RETURNING id",
  addParticipant:
    "INSERT INTO conversation_participants(conversation_id, user_id) VALUES($1, $2)",
  newMessage:
    "INSERT INTO messages(conversation_id, message, sender, created_at) VALUES($1, $2, $3, $4)",
  getConversations: `
    SELECT c.*, array_agg(cp.user_id) as participants 
    FROM conversations c 
    JOIN conversation_participants cp ON c.id = cp.conversation_id 
    WHERE cp.user_id = $1 
    GROUP BY c.id
  `,
  getMessages:
    "SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
  getAvailableUsers: `
    SELECT DISTINCT user_id 
    FROM conversation_participants 
    WHERE user_id != $1
  `,
};

// Add error handler for the WebSocket server
wss.on("error", function (error) {
  console.error("WebSocket Server Error:", error);
});

wss.on("connection", async function connection(ws, req) {
  // Set socket options on the underlying socket
  const socket = req.socket;
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 30000);

  const params = new URLSearchParams(req.url.slice(1));
  const userId = parseInt(params.get("id"));

  console.log(`WebSocket connection established for user ${userId}`);
  console.log(`Client IP: ${req.socket.remoteAddress}`);
  console.log(`Connection URL parameters: ${req.url}`);

  // Set WebSocket properties immediately
  ws.isAlive = true;
  ws.setMaxListeners(20);

  // Setup ping-pong for connection health check
  const pingInterval = setInterval(() => {
    if (ws.isAlive === false) {
      clearInterval(pingInterval);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  }, 30000);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("close", () => {
    clearInterval(pingInterval);
    console.log(`WebSocket connection closed for user ${userId}`);
    connections.delete(userId);
  });

  let client;
  try {
    client = await pool.connect();

    // Get user's conversations
    const { rows: conversations } = await client.query(
      queries.getConversations,
      [userId]
    );
    const { rows: availableUsers } = await client.query(
      queries.getAvailableUsers,
      [userId]
    );

    console.log(`Sending initial data to user ${userId}`);
    console.log(`Found ${conversations.length} conversations`);
    console.log(`Found ${availableUsers.length} available users`);

    // Store the connection only after successful data fetch
    connections.set(userId, ws);

    // Send initial data
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: "init",
          data: {
            conversations,
            availableUsers: availableUsers.map((u) => u.user_id),
          },
        })
      );
    }
  } catch (err) {
    console.error(`Error fetching initial data for user ${userId}:`, err);
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          error: "Failed to load initial data",
          details: err.message,
        })
      );
    }
  } finally {
    if (client) {
      client.release();
    }
  }

  ws.on("error", function error(err) {
    console.error(`WebSocket error for user ${userId}:`, err);
    ws.isAlive = false;
    connections.delete(userId);
    if (!ws.destroyed) {
      ws.terminate();
    }
  });

  ws.on("message", async function incoming(message) {
    console.log(`Received message from user ${userId}:`, message.toString());
    const data = JSON.parse(message);
    const client = await pool.connect();

    try {
      switch (data.type) {
        case "startConversation": {
          console.log(
            `User ${userId} starting new conversation with participants:`,
            data.participants
          );
          // Create new conversation
          const {
            rows: [conversation],
          } = await client.query(queries.createConversation, [data.name]);

          // Add participants
          const participants = [userId, ...data.participants];
          for (const participant of participants) {
            await client.query(queries.addParticipant, [
              conversation.id,
              participant,
            ]);
          }

          // Notify all participants
          const { rows: messages } = await client.query(queries.getMessages, [
            conversation.id,
          ]);
          const update = {
            type: "newConversation",
            data: { ...conversation, participants, messages },
          };

          participants.forEach((participantId) => {
            const conn = connections.get(participantId);
            if (conn) {
              conn.send(JSON.stringify(update));
            }
          });
          break;
        }

        case "sendMessage": {
          console.log(
            `User ${userId} sending message in conversation ${data.conversationId}`
          );
          // Save message
          await client.query(queries.newMessage, [
            data.conversationId,
            data.message,
            userId,
            Date.now(),
          ]);

          // Get updated messages
          const { rows: messages } = await client.query(queries.getMessages, [
            data.conversationId,
          ]);

          // Get conversation participants
          const {
            rows: [conversation],
          } = await client.query(
            "SELECT array_agg(user_id) as participants FROM conversation_participants WHERE conversation_id = $1",
            [data.conversationId]
          );

          // Send to all participants
          const update = {
            type: "messagesUpdate",
            data: {
              conversationId: data.conversationId,
              messages,
            },
          };

          conversation.participants.forEach((participantId) => {
            const conn = connections.get(participantId);
            if (conn) {
              conn.send(JSON.stringify(update));
            }
          });
          break;
        }
      }
    } catch (err) {
      console.error(`Error processing message from user ${userId}:`, err);
      ws.send(
        JSON.stringify({
          type: "error",
          error: "Failed to process message",
          details: err.message,
          messageType: data.type,
        })
      );
    } finally {
      client.release();
    }
  });
});

let nextId = 0;
app.get("/id", (req, res) => res.status(200).send({ id: nextId++ }));
app.get("/", (req, res) => res.status(200).send("200 OK"));

const httpServer = server.listen(PORT, () => {
  console.log("Listening on port %d", PORT);
});

let isShuttingDown = false;

// Graceful shutdown handling
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Received shutdown signal, closing connections gracefully...");

  // Clear the connection logging interval
  clearInterval(connectionLogInterval);

  // Notify all clients about the shutdown
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: "shutdown",
          message: "Server is shutting down",
        })
      );
    }
  });

  // Give clients some time to receive the shutdown message
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Close all WebSocket connections gracefully
  wss.clients.forEach((client) => {
    client.close(1000, "Server shutting down");
  });

  // Close the WebSocket server first
  await new Promise((resolve) => {
    wss.close(() => {
      console.log("WebSocket server closed");
      resolve();
    });
  });

  // Close HTTP server with timeout
  await new Promise((resolve) => {
    const forceClose = setTimeout(() => {
      console.log("Forcing HTTP server close");
      httpServer.close(() => resolve());
    }, SHUTDOWN_TIMEOUT);

    httpServer.close(() => {
      clearTimeout(forceClose);
      console.log("HTTP server closed gracefully");
      resolve();
    });
  });

  await shutdownDatabase();
};

const shutdownDatabase = async () => {
  try {
    await pool.end();
    console.log("Database pool closed");
    process.exit(0);
  } catch (err) {
    console.error("Error closing database pool:", err);
    process.exit(1);
  }
};

// Listen for shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
