class WebSocketService {
  constructor() {
    this.ws = null;
    this.messageHandler = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.pingInterval = null;
  }

  connect(url) {
    this.url = url;
    return this.establishConnection();
  }

  establishConnection() {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
        this.ws.close(1000, "Reconnecting");
      }

      console.log("Attempting WebSocket connection to:", this.url);
      this.ws = new WebSocket(this.url);

      // Set up ping interval to keep connection alive
      this.setupPing();

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "error") {
            console.error("Server error:", data.error, data.details);
            return;
          }
          if (this.messageHandler) {
            this.messageHandler(data);
          }
        } catch (error) {
          console.error("Error processing message:", error);
        }
      };

      this.ws.onopen = () => {
        console.log("WebSocket connection established");
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      this.ws.onclose = (event) => {
        console.log(
          `WebSocket connection closed with code ${event.code}, reason: ${event.reason}`
        );
        this.clearPing();

        // Don't reconnect on normal closure (1000) or if going away (1001)
        if (event.code !== 1000 && event.code !== 1001) {
          this.attemptReconnect();
        }
      };
    });
  }

  setupPing() {
    this.clearPing(); // Clear any existing interval
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 20000); // Send ping every 20 seconds
  }

  clearPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  attemptReconnect(reject) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts - 1),
        10000
      );

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        this.establishConnection().catch((err) => {
          console.error("Reconnection attempt failed:", err);
          if (reject) reject(err);
        });
      }, delay);
    } else {
      const error = new Error(
        "WebSocket connection failed after maximum retry attempts"
      );
      console.error(error.message);
      if (reject) reject(error);
    }
  }

  setMessageHandler(handler) {
    this.messageHandler = handler;
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        throw error;
      }
    } else {
      console.warn("WebSocket is not connected, message not sent");
    }
  }

  disconnect() {
    this.clearPing();
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close(1000, "Disconnecting");
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }
}

export default new WebSocketService();
