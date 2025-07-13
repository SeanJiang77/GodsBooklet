import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import roomRoutes from "./routes/roomRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect("mongodb+srv://seanjiang2005:Lihailezzm-2004@godsbooklet.rx0tms1.mongodb.net/")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("DB连接失败", err));

app.use("/api/rooms", roomRoutes);

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});