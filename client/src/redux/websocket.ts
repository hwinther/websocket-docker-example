import { WebSocketMessage } from "../types";
import { logger } from "../utils/logger";

type MessageHandler = (data: WebSocketMessage) => void;
type ReconnectConfig = {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
};

class WebSocketService {
  private ws: WebSocket | null;
  private messageHandler: MessageHandler | null;
  private url: string | null;
  private reconnectAttempts: number;
  private readonly reconnectConfig: ReconnectConfig;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null;
  private pingInterval: ReturnType<typeof setInterval> | null;

  constructor() {
    this.ws = null;
    this.messageHandler = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.reconnectConfig = {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 10000,
    };
    this.reconnectTimeout = null;
    this.pingInterval = null;
  }

  connect(url: string): Promise<void> {
    this.url = url;
    return this.establishConnection();
  }

  private establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
        this.ws.close(1000, "Reconnecting");
      }

      logger.info("Attempting WebSocket connection to:", this.url);
      if (!this.url) {
        reject(new Error("No URL provided"));
        return;
      }

      this.ws = new WebSocket(this.url);
      this.setupPing();

      this.ws.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as WebSocketMessage;
          if (data.type === "error") {
            logger.error("Server error:", data.error, data.details);
            return;
          }
          if (this.messageHandler) {
            this.messageHandler(data);
          }
        } catch (error) {
          logger.error("Error processing message:", error);
        }
      };

      this.ws.onopen = () => {
        logger.info("WebSocket connection established");
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error: Event) => {
        logger.error("WebSocket error:", error);
      };

      this.ws.onclose = (event: CloseEvent) => {
        logger.info(
          `WebSocket connection closed with code ${event.code}, reason: ${event.reason}`
        );
        this.clearPing();

        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect(reject);
        }
      };
    });
  }

  private setupPing(): void {
    this.clearPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 20000);
  }

  private clearPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(reject?: (reason?: Error) => void): void {
    if (this.reconnectAttempts < this.reconnectConfig.maxAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectConfig.baseDelay *
          Math.pow(2, this.reconnectAttempts - 1),
        this.reconnectConfig.maxDelay
      );

      logger.info(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.reconnectConfig.maxAttempts})`
      );

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => {
        this.establishConnection().catch((err) => {
          logger.error("Reconnection attempt failed:", err);
          if (reject) reject(err);
        });
      }, delay);
    } else {
      const error = new Error(
        "WebSocket connection failed after maximum retry attempts"
      );
      logger.error(error.message);
      if (reject) reject(error);
    }
  }

  setMessageHandler(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  send(data: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        logger.error("Error sending WebSocket message:", error);
        throw error;
      }
    } else {
      logger.warn("WebSocket is not connected, message not sent");
    }
  }

  disconnect(): void {
    this.clearPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close(1000, "Disconnecting");
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }
}

export default new WebSocketService();
