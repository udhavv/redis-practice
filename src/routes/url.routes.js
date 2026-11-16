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


router.use(protect);

router.post("/", createUrl);
router.get("/", getUrls);
router.get("/:id", getUrl);
router.delete("/:id", deleteUrl);

router.get("/code/:id", redirectUrl);


export default router;