/**
 * Module declarations for packages without TypeScript definitions
 * This file helps TypeScript understand modules that don't have type definitions
 */

// Declare modules that don't have types
declare module '@auth/mongodb-adapter' {
  import { Adapter } from 'next-auth/adapters';
  export function MongoDBAdapter(client: Promise<any>): Adapter;
}

// Add any other module declarations as needed
