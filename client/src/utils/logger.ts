type LogLevel = "info" | "warn" | "error";

class Logger {
  private readonly isDevelopment = import.meta.env.MODE === "development";

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (this.isDevelopment) {
      console[level](`[${level.toUpperCase()}] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log("error", message, ...args);
  }
}

export const logger = new Logger();
