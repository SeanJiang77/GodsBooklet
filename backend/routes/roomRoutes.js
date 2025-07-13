import express from "express";
import Room from "../models/room.js";

const router = express.Router();

// 创建房间
router.post("/", async (req, res) => {
  try {
    const newRoom = new Room(req.body);
    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) {
    console.error("创建房间失败：", err);
    res.status(500).json({ error: "创建房间失败" });
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