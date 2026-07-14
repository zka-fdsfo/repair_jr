import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import KbEntry from "../models/KbEntry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "fonefix_rag_dataset.jsonl");

function parseLine(line) {
  const raw = JSON.parse(line);
  const doc = { entryId: raw.id, text: raw.text, ...raw.metadata };
  if (doc.price !== undefined) {
    doc.price = Number(doc.price);
  }
  return doc;
}

async function importData() {
  const fileContents = fs.readFileSync(DATA_PATH, "utf8");
  const lines = fileContents.split(/\r\n/).filter((line) => line.trim());
  const docs = lines.map(parseLine);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`[import-data] connected, importing ${docs.length} docs`);

  await KbEntry.deleteMany({});
  await KbEntry.insertMany(docs);

  console.log(`[import-data] inserted ${docs.length} docs into kb_entries`);
  await mongoose.disconnect();
}

importData().catch((err) => {
  console.error("[import-data] failed:", err.message);
  process.exit(1);
});
