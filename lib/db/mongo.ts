import { MongoClient, MongoClientOptions } from "mongodb";

/**
 * MongoDB client for NextAuth adapter
 * This is separate from Mongoose and used specifically for NextAuth
 */

declare global {
  // eslint-disable-next-line no-unused-vars
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;

const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

let clientPromise: Promise<MongoClient> | undefined;

if (!uri) {
  console.warn("MONGODB_URI not set - auth adapter disabled");
  clientPromise = undefined;
} else {
  try {
    if (process.env.NODE_ENV === "development") {
      if (!global._mongoClientPromise) {
        const client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect().catch((err) => {
          console.error("MongoDB connection failed:", err.message);
          throw err;
        });
      }
      clientPromise = global._mongoClientPromise;
    } else {
      const client = new MongoClient(uri, options);
      clientPromise = client.connect().catch((err) => {
        console.error("MongoDB connection failed:", err.message);
        throw err;
      });
    }
  } catch (err) {
    console.error("MongoDB client initialization failed:", err);
    clientPromise = undefined;
  }
}

export default clientPromise;
