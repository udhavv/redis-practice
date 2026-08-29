import { PrismaClient } from "./generated/prisma/client.ts";


import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "./generated/prisma/client.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from the .env file");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// const prisma = new PrismaClient({
//   adapter,
// });

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})
