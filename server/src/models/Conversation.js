import mongoose from "mongoose";

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    role: { type: String, required: true }, // "system" | "user" | "assistant" | "tool"
    content: Schema.Types.Mixed,
    tool_calls: Schema.Types.Mixed,
    tool_call_id: String,
    name: String,
  },
  { _id: false }
);

const conversationSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    messages: [messageSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);
