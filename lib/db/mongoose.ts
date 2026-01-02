import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: typeof import("mongoose") | null;
    promise: Promise<typeof import("mongoose")> | null;
  };
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose || { conn: null, promise: null };

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB using Mongoose with connection pooling
 * @returns Promise<typeof mongoose>
 */
async function connectMongo(): Promise<typeof mongoose> {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI environment variable is not defined. Please add it to your .env.local file"
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,  // 30 seconds for initial server selection
      connectTimeoutMS: 30000,          // 30 seconds for initial connection
      socketTimeoutMS: 45000,           // 45 seconds for socket operations
      heartbeatFrequencyMS: 10000,      // Check server health every 10 seconds
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectMongo;
