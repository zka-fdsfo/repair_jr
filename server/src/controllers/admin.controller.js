import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import KbEntry from "../models/KbEntry.js";

const KB_TYPES = ["price", "device_catalog", "brand_catalog", "problem_catalog"];

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        error: true,
        message: "email and password are required",
        code: "bad_request",
      });
    }

    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ error: true, message: "Invalid credentials", code: "unauthorized" });
    }

    const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || "");
    if (!valid) {
      return res.status(401).json({ error: true, message: "Invalid credentials", code: "unauthorized" });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "12h" });
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

export async function listKbEntries(req, res, next) {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    const entries = await KbEntry.find(filter).lean();
    res.json(entries);
  } catch (err) {
    next(err);
  }
}

export async function getKbEntry(req, res, next) {
  try {
    const entry = await KbEntry.findOne({ entryId: req.params.entryId }).lean();
    if (!entry) {
      return res.status(404).json({ error: true, message: "Entry not found", code: "not_found" });
    }
    res.json(entry);
  } catch (err) {
    next(err);
  }
}

export async function createKbEntry(req, res, next) {
  try {
    const { entryId, type } = req.body;
    if (!entryId || !type) {
      return res.status(400).json({
        error: true,
        message: "entryId and type are required",
        code: "bad_request",
      });
    }
    if (!KB_TYPES.includes(type)) {
      return res.status(400).json({
        error: true,
        message: `type must be one of: ${KB_TYPES.join(", ")}`,
        code: "bad_request",
      });
    }

    const existing = await KbEntry.findOne({ entryId });
    if (existing) {
      return res.status(409).json({ error: true, message: "entryId already exists", code: "conflict" });
    }

    const entry = await KbEntry.create(req.body);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
}

export async function updateKbEntry(req, res, next) {
  try {
    const entry = await KbEntry.findOneAndUpdate(
      { entryId: req.params.entryId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!entry) {
      return res.status(404).json({ error: true, message: "Entry not found", code: "not_found" });
    }
    res.json(entry);
  } catch (err) {
    next(err);
  }
}
