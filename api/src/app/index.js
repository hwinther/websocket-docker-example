import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";
import pool from "../models/index.js";

const PORT = 3000;
const app = express();

app.use(bodyParser.json());
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const connections = {}; // pair off connections by 2's {0,1}, {2,3}

const queries = {
  newMessage:
    "INSERT INTO messages(message, sender, createdAt) VALUES($1, $2, $3)",
  getMessages: "SELECT * FROM messages WHERE sender = $1 OR sender = $2",
};

wss.on("connection", async function connection(ws, req) {
  const params = new URLSearchParams(req.url.slice(1));
  const id = params.get("id");

  connections[id] = {
    sender: id,
    ws,
  };

  ws.on("message", async function incoming(message) {
    const parsedMessage = JSON.parse(message);
    const client = await pool.connect();

    try {
      // Insert new message
      await client.query(queries.newMessage, [
        parsedMessage.message,
        parsedMessage.sender,
        parsedMessage.createdAt,
      ]);

      // Calculate the receiver
      const receiver =
        parsedMessage.sender % 2 === 0
          ? parsedMessage.sender + 1
          : parsedMessage.sender - 1;

      // Get updated messages
      const { rows: messages } = await client.query(queries.getMessages, [
        parsedMessage.sender,
        receiver,
      ]);

      const sortedMessages = messages.sort(
        (a, b) => parseInt(a.createdAt, 10) - parseInt(b.createdAt, 10)
      );

      // Send to sender
      connections[parsedMessage.sender].ws.send(
        JSON.stringify({ data: sortedMessages })
      );

      // Send to receiver if connected
      const receiverConn = connections[receiver];
      if (receiverConn) {
        receiverConn.ws.send(JSON.stringify({ data: sortedMessages }));
      }
    } catch (err) {
      console.error("Error processing message:", err);
      ws.send(JSON.stringify({ error: "Failed to process message" }));
    } finally {
      client.release();
    }
  });

  // Load previous messages for odd-numbered IDs
  if (id % 2 === 1) {
    const client = await pool.connect();
    try {
      const { rows: messages } = await client.query(queries.getMessages, [
        id,
        id - 1,
      ]);

      const sortedMessages = messages.sort(
        (a, b) => parseInt(a.createdAt, 10) - parseInt(b.createdAt, 10)
      );

      connections[id].ws.send(JSON.stringify({ data: sortedMessages }));
    } catch (err) {
      console.error("Error loading previous messages:", err);
      ws.send(JSON.stringify({ error: "Failed to load messages" }));
    } finally {
      client.release();
    }
  }
});

let id = 0;
app.get("/id", (req, res) => res.status(200).send({ id: id++ }));
app.get("/", (req, res) => res.status(200).send("200 OK"));

server.listen(PORT, () => {
  console.log("Listening on port %d", PORT);
});
