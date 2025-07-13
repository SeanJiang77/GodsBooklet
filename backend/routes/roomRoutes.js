import express from "express";
import Room from "../models/Room.js";
import Player from "../models/Player.js";

const router = express.Router();

// 创建房间
router.post("/", async (req, res) => {
  try {
    const { playerCount, roles } = req.body;
    const totalRoles = Object.values(roles || {}).reduce((sum, num) => sum + Number(num), 0);
    if (playerCount < totalRoles) {
      return res.status(400).json({ error: `玩家数量不足，至少需要 ${totalRoles} 名玩家来匹配所有身份` });
    }
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
