import { Router } from "express";
import { postChat } from "../controllers/chat.controller.js";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/chat", rateLimiter, postChat);

export default router;
