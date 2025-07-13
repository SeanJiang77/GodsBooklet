import express from "express";
import Room from "../models/room.js";

const router = express.Router();

// 创建房间
router.post("/", async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: "房间创建失败", error: err.message });
  }
});

// 获取房间（可选）
router.get("/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "房间未找到" });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: "获取失败", error: err.message });
  }
});

export default router;