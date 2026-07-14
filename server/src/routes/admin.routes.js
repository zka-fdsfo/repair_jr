import { Router } from "express";
import {
  login,
  listKbEntries,
  getKbEntry,
  createKbEntry,
  updateKbEntry,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

router.post("/admin/login", login);
router.get("/admin/kb-entries", requireAdmin, listKbEntries);
router.get("/admin/kb-entries/:entryId", requireAdmin, getKbEntry);
router.post("/admin/kb-entries", requireAdmin, createKbEntry);
router.put("/admin/kb-entries/:entryId", requireAdmin, updateKbEntry);

export default router;
