import { PrismaClient } from "../generated/prisma/client.ts";


import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "./generated/prisma/client.js";

const env= process.env.NODE_ENV

const url= env==='development' ? process.env.DATABASE_URL : process.env.DATABASE_URL_ONLINE

if (!url) {
  throw new Error("DATABASE_URL is missing from the .env file");
}

const adapter = new PrismaPg({
  connectionString: url,
});

// const prisma = new PrismaClient({
//   adapter,
// });

const prisma = new PrismaClient({
  adapter,
  log: env === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

export default prisma;


