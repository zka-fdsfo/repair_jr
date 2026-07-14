import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", chatRoutes);
app.use("/api", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
