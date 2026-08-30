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



// import express from "express";
// import cors from 'cors';
// import dotenv from 'dotenv';

// dotenv.config();

// const app= express();


// app.use(express.json())
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// // app.use(cookieParser());
// app.use(cors({
//   origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000', 'http://192.168.12.77:3000'],
//     credentials: true,

// }));



// const port=process.env.PORT

// app.listen(4000, () => {
//     console.log('listening in port 4000');
// })

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import urlRoutes from "./routes/url.routes.js";
// import analyticsRoutes from "./routes/analytics.routes.js";
// import redirectRoutes from "./routes/redirect.routes.js";

const app = express();

// -------------------------
// Global Middleware
// -------------------------

app.use(
  cors({
    // origin: process.env.FRONTEND_URL,
    origin: '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// -------------------------
// Health Check
// -------------------------

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "URL Shortener API is running",
  });
});

// -------------------------
// API Routes
// -------------------------

app.use("/api/auth", authRoutes);

app.use("/api/urls", urlRoutes);

// app.use("/api/analytics", analyticsRoutes);

// -------------------------
// Short URL Redirect
// -------------------------

// app.use("/", redirectRoutes);

// -------------------------
// 404 Handler
// -------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// -------------------------
// Global Error Handler
// -------------------------

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// export default app;

app.listen(4000, () => {
    console.log('listening in port 4000');
})


