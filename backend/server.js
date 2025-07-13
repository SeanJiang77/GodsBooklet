import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import roomRoutes from "./routes/roomRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

// 路由
app.use("/api/rooms", roomRoutes);

// 统一错误处理
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || "服务器内部错误",
  });
});

// 启动
mongoose
  .connect("mongodb+srv://seanjiang2005:Lihailezzm-2004@godsbooklet.rx0tms1.mongodb.net/")
  .then(() => {
    console.log("MongoDB connected");
    app.listen(3001, () => {
      console.log("Server listening on http://localhost:3001");
    });
  })
  .catch((err) => {
    console.error("DB 连接失败", err);
  });