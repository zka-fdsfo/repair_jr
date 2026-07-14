import mongoose from "mongoose";

const { Schema } = mongoose;

const kbEntrySchema = new Schema(
  {
    entryId: { type: String, required: true, unique: true },
    text: String,
    type: {
      type: String,
      enum: ["price", "device_catalog", "brand_catalog", "problem_catalog"],
    },

    // present on type: "price"
    brand: String,
    device: String,
    model: String,
    problem: String,
    part_type: String,
    price: Number,
    turnover_time: String,
    warranty: String,

    // present on type: "device_catalog" / "brand_catalog"
    device_count: Number,
    model_count: Number,

    url_path: String,
  },
  { strict: false, collection: "kb_entries" }
);

kbEntrySchema.index({ type: 1, model: 1, problem: 1 });
kbEntrySchema.index({ type: 1, brand: 1 });
kbEntrySchema.index({ text: "text" });

export default mongoose.model("KbEntry", kbEntrySchema);
