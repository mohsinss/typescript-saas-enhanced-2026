import { NextResponse } from "next/server";
import connectMongo from "@/lib/db/mongoose";
import { env, features } from "@/lib/config/env";
import { stripe } from "@/lib/payments/stripe";
import { logger } from "@/lib/infrastructure/logger";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database?: "connected" | "disconnected" | "error";
    stripe?: "connected" | "disconnected" | "error";
    authentication?: "configured" | "not-configured";
    email?: "configured" | "not-configured";
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * Health check endpoint
 * GET /api/v1/health
 */
export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();
  
  const health: HealthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: env.NODE_ENV,
    checks: {},
    uptime: process.uptime(),
    memory: {
      used: 0,
      total: 0,
      percentage: 0,
    },
  };
  
  // Memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
  };
  
  try {
    // Database check
    try {
      await connectMongo();
      health.checks.database = "connected";
    } catch (error) {
      logger.error("Database health check failed", error);
      health.checks.database = "error";
      health.status = "degraded";
    }
    
    // Stripe check (if configured)
    if (features.stripe) {
      try {
        // Simple check to see if Stripe is configured correctly
        await stripe.prices.list({ limit: 1 });
        health.checks.stripe = "connected";
      } catch (error) {
        logger.error("Stripe health check failed", error);
        health.checks.stripe = "error";
        health.status = "degraded";
      }
    } else {
      health.checks.stripe = "disconnected";
    }
    
    // Authentication check
    health.checks.authentication = features.googleAuth || features.emailAuth
      ? "configured"
      : "not-configured";
    
    // Email check
    health.checks.email = features.mailgun ? "configured" : "not-configured";
    
    // If any critical service is down, mark as unhealthy
    if (health.checks.database === "error") {
      health.status = "unhealthy";
    }
    
  } catch (error) {
    logger.error("Health check failed", error);
    health.status = "unhealthy";
  }
  
  const responseTime = Date.now() - startTime;
  
  // Return appropriate status code based on health
  const statusCode = health.status === "healthy" ? 200 : 
                     health.status === "degraded" ? 200 : 503;
  
  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      "X-Response-Time": `${responseTime}ms`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * Liveness check endpoint (simpler, just checks if service is running)
 * GET /api/v1/health/live
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
