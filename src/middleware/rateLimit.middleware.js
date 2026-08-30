import redis from "../config/redis.js";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 100;

export const rateLimiter = async (req, res, next) => {
  try {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      "unknown";

    const key = `rate-limit:${ip}`;

    const currentCount = await redis.incr(key);

    // First request → create 60-second expiration
    if (currentCount === 1) {
      await redis.expire(
        key,
        WINDOW_SECONDS
      );
    }

    // Send rate-limit information to client
    res.setHeader(
      "X-RateLimit-Limit",
      MAX_REQUESTS
    );

    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(
        0,
        MAX_REQUESTS - currentCount
      )
    );

    if (currentCount > MAX_REQUESTS) {
      const ttl = await redis.ttl(key);

      res.setHeader(
        "Retry-After",
        ttl
      );

      return res.status(429).json({
        success: false,
        message:
          "Too many requests. Please try again later.",
        retryAfter: ttl,
      });
    }

    next();
  } catch (error) {
    console.error(
      "Rate limiter error:",
      error
    );

    /*
     * If Redis is temporarily unavailable,
     * allow the request instead of taking
     * the entire API down.
     */
    next();
  }
};