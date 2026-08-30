import express from "express";

import {
  createUrl,
  getUrls,
  getUrl,
  deleteUrl,
  redirectUrl,
} from "../controllers/url.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/*
 * Protected URL routes
 */

// POST /api/urls
router.post("/", protect, createUrl);

// GET /api/urls
router.get("/", protect, getUrls);

// GET /api/urls/:id
router.get("/:id", protect, getUrl);

// DELETE /api/urls/:id
router.delete("/:id", protect, deleteUrl);

/*
 * Short URL redirect
 *
 * GET /:shortCode
 *
 * This route is mounted separately in app.js
 */
router.get("/:shortCode", redirectUrl);

export default router;