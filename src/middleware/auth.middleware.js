import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import redis from "../config/redis.js";

const USER_CACHE_TTL = 3600; // 1 hour

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    // 1. Fast check: is this access token blacklisted (logged out)?
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked",
      });
    }

    // 2. Verify token signature & expiry
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3. Fast check: Fetch user from Redis Cache (< 1ms, avoids DB lookup)
    const cacheKey = `user:${decoded.userId}`;
    const cachedUser = await redis.get(cacheKey);

    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    // 4. Cache Miss: Fallback to Prisma
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // 5. Populate Redis Cache for subsequent requests
    await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(user));

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED", // Allows frontend interceptor to trigger /api/auth/refresh
        message: "Access token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};