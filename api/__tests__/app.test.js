import request from "supertest";
import { WebSocket } from "ws";
import http from "http";
import { jest } from "@jest/globals";

// Mock the database pool
jest.mock("../src/models/index.js", () => ({
  __esModule: true,
  default: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

describe("Chat API", () => {
  let server;
  let app;

  beforeAll(async () => {
    // Import the app after setting up mocks
    const { default: expressApp } = await import("../src/app/index.js");
    app = expressApp;
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
  });

  afterAll((done) => {
    server.close(done);
  });

  test("GET /id returns incremental IDs", async () => {
    const response1 = await request(app).get("/id");
    expect(response1.status).toBe(200);
    expect(response1.body).toHaveProperty("id");

    const response2 = await request(app).get("/id");
    expect(response2.body.id).toBe(response1.body.id + 1);
  });

  test("GET / returns 200 OK", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("200 OK");
  });

  test("WebSocket connection works", (done) => {
    const port = server.address().port;
    const ws = new WebSocket(`ws://localhost:${port}?id=0`);

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
      const message = JSON.parse(data.toString());
      expect(message).toHaveProperty("data");
      ws.close();
      done();
    });
  });
});
