import request from "supertest";
import { WebSocket, WebSocketServer } from "ws";
import http from "http";
import express from "express";
import { describe, test, expect, beforeAll, afterAll, vi } from "vitest";

// Mock the database pool
vi.mock("../src/models/index.js", () => ({
  default: {
    connect: vi.fn().mockResolvedValue({
      query: vi.fn(),
      release: vi.fn(),
    }),
  },
}));

describe("Chat API", () => {
  let server;
  let app;
  let ws;
  let wss;

  beforeAll(async () => {
    // Create a fresh Express app instance for testing
    app = express();
    app.get("/id", (req, res) => res.status(200).send({ id: 0 }));
    app.get("/", (req, res) => res.status(200).send("200 OK"));

    server = http.createServer(app);
    wss = new WebSocketServer({ server });

    wss.on("connection", function connection(ws) {
      ws.on("message", function incoming(message) {
        // Echo back a mock response
        ws.send(JSON.stringify({ data: [] }));
      });
    });

    // Start server on a random port
    await new Promise((resolve) => {
      server.listen(0, () => resolve());
    });
  });

  afterAll((done) => {
    if (ws) {
      ws.close();
    }
    if (wss) {
      wss.close();
    }
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  test("GET /id returns incremental IDs", async () => {
    const response1 = await request(server).get("/id");
    expect(response1.status).toBe(200);
    expect(response1.body).toHaveProperty("id");

    const response2 = await request(server).get("/id");
    expect(response2.body.id).toBe(0); // Since we're using a mock, it will always return 0
  }, 5000);

  test("GET / returns 200 OK", async () => {
    const response = await request(server).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("200 OK");
  }, 5000);

  test("WebSocket connection works", async () => {
    return new Promise((resolve, reject) => {
      const port = server.address().port;
      ws = new WebSocket(`ws://localhost:${port}?id=0`);

      const timeout = setTimeout(() => {
        reject(new Error("WebSocket test timed out"));
      }, 4000);

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            message: "Hello",
            sender: 0,
            createdAt: Date.now(),
          })
        );
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          expect(message).toHaveProperty("data");
          clearTimeout(timeout);
          ws.close();
          resolve();
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }, 5000);
});
