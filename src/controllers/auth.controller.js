import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import redis from "../config/redis.js";

// Time constants (in seconds)
const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
const USER_CACHE_TTL = 3600; // 1 hour

const isProduction = process.env.NODE_ENV === "production";

// Shared cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

// Generate access and refresh tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: `${ACCESS_TOKEN_EXPIRY}s` }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY}s` }
  );

  return { accessToken, refreshToken };
};

// Helper: Cache user data in Redis
const cacheUser = async (user) => {
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
  await redis.setex(`user:${user.id}`, USER_CACHE_TTL, JSON.stringify(safeUser));
  return safeUser;
};

// Helper: Set cookies on response
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_EXPIRY * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_EXPIRY * 1000,
  });
};

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // 10 rounds is ~3x faster than 12 while remaining secure

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token & pre-warm user cache in Redis
    await Promise.all([
      redis.setex(`refreshToken:${user.id}`, REFRESH_TOKEN_EXPIRY, refreshToken),
      cacheUser(user),
    ]);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: "Registration successful",
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token & pre-warm user cache in Redis
    await Promise.all([
      redis.setex(`refreshToken:${user.id}`, REFRESH_TOKEN_EXPIRY, refreshToken),
      cacheUser(user),
    ]);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/auth/refresh
export const refresh = async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    // 1. Verify token signature
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    // 2. Match token stored in Redis
    const storedRefreshToken = await redis.get(`refreshToken:${decoded.userId}`);
    if (!storedRefreshToken || storedRefreshToken !== incomingRefreshToken) {
      return res.status(403).json({ message: "Invalid or revoked refresh token" });
    }

    // 3. Issue new tokens (Token Rotation)
    const { accessToken, refreshToken } = generateTokens(decoded.userId);

    // Update refresh token in Redis
    await redis.setex(`refreshToken:${decoded.userId}`, REFRESH_TOKEN_EXPIRY, refreshToken);

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    // 1. Remove refresh token from Redis
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded?.userId) {
          await redis.del(`refreshToken:${decoded.userId}`);
        }
      } catch (_) {}
    }

    // 2. Blacklist remaining lifespan of access token
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded?.exp) {
          const remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
          if (remainingSeconds > 0) {
            await redis.setex(`blacklist:${accessToken}`, remainingSeconds, "revoked");
          }
        }
      } catch (_) {}
    }

    // 3. Clear cookies
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/auth/me
// protect middleware already loaded user from Redis / DB and set req.user
export const getMe = async (req, res) => {
  return res.status(200).json({ user: req.user });
};