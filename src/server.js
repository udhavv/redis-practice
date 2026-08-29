// import "dotenv/config";

// import app from "./app.js";
// import prisma from "./config/db.js";
// import redis from "./config/redis.js";

// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     // Test PostgreSQL connection
//     await prisma.$connect();

//     console.log("PostgreSQL connected");

//     // Redis connection
//     if (!redis.isOpen) {
//       await redis.connect();
//     }

//     console.log("Redis connected");

//     const server = app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//       console.log(`http://localhost:${PORT}`);
//     });

//     // -------------------------
//     // Graceful Shutdown
//     // -------------------------

//     const shutdown = async (signal) => {
//       console.log(`${signal} received. Shutting down...`);

//       server.close(async () => {
//         try {
//           await prisma.$disconnect();

//           if (redis.isOpen) {
//             await redis.quit();
//           }

//           console.log("Server shut down successfully");
//           process.exit(0);
//         } catch (error) {
//           console.error("Shutdown error:", error);
//           process.exit(1);
//         }
//       });
//     };

//     process.on("SIGINT", () => shutdown("SIGINT"));
//     process.on("SIGTERM", () => shutdown("SIGTERM"));
//   } catch (error) {
//     console.error("Failed to start server:", error);

//     await prisma.$disconnect();

//     if (redis.isOpen) {
//       await redis.quit();
//     }

//     process.exit(1);
//   }
// };

// startServer();



import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app= express();


app.use(express.json())
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000', 'http://192.168.12.77:3000'],
    credentials: true,

}));



const port=process.env.PORT

app.listen(4000, () => {
    console.log('listening in port 4000');
})
