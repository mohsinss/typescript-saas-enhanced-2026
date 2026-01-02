/**
 * Centralized logging infrastructure
 * Uses console in development, can be extended with Winston/Pino for production
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isTest = process.env.NODE_ENV === "test";
  
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }
  
  private shouldLog(level: LogLevel): boolean {
    // Don't log in test environment unless it's an error
    if (this.isTest && level !== "error") {
      return false;
    }
    
    // In production, skip debug logs
    if (!this.isDevelopment && level === "debug") {
      return false;
    }
    
    return true;
  }
  
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;
    
    if (this.isDevelopment) {
      console.debug(message, context);
    }
  }
  
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;
    
    if (this.isDevelopment) {
      console.info(message, context);
    } else {
      // In production, send to logging service
      console.log(this.formatMessage("info", message, context));
    }
  }
  
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog("warn")) return;
    
    if (this.isDevelopment) {
      console.warn(message, context);
    } else {
      console.warn(this.formatMessage("warn", message, context));
    }
  }
  
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog("error")) return;
    
    const errorContext = {
      ...context,
      ...(error instanceof Error && {
        errorMessage: error.message,
        errorStack: error.stack,
      }),
    };
    
    if (this.isDevelopment) {
      console.error(message, error, errorContext);
    } else {
      console.error(this.formatMessage("error", message, errorContext));
      
      // In production, send to error tracking service (e.g., Sentry)
      // TODO: Integrate with error tracking service
    }
  }
  
  /**
   * Log API request/response
   */
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, context);
  }
  
  /**
   * Log database operations
   */
  dbQuery(operation: string, collection: string, context?: LogContext): void {
    this.debug(`DB ${operation} ${collection}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();
