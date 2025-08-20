import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import roomsRouter from "./routes/rooms.js";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/rooms", roomsRouter);

// 错误处理
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server Error" });
});

// 从 .env 读取
const { MONGO_URI = "mongodb://127.0.0.1:27017/godsbooklet", PORT = 3000 } = process.env;

// 打印一下，确认 .env 生效（上线时可以移除）
console.log("Using MONGO_URI:", MONGO_URI);

mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error("Mongo connection failed:", e);
    process.exit(1);
  });
  