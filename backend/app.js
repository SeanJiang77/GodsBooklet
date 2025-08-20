// app.js
import express from "express";
import mongoose from "mongoose";
import roomsRouter from "./routes/rooms.js";

const app = express();
app.use(express.json());

// Basic CORS for local dev
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Routes
app.use("/rooms", roomsRouter);

// Error handler
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server Error" });
});

const { MONGO_URI = "mongodb://127.0.0.1:27017/godsbooklet", PORT = 3000 } = process.env;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error("Mongo connection failed:", e.message);
    process.exit(1);
  });
