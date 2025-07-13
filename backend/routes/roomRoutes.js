import express from "express";
import Room from "../models/Room.js";
import Player from "../models/Player.js";

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

// 获取所有房间（带玩家信息）
router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().populate("players");
    res.json(rooms);
  } catch (err) {
    console.error("获取房间失败:", err);
    res.status(500).json({ error: "获取房间失败" });
  }
});

export default router;
