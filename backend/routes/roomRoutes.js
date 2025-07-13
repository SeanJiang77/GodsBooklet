import express from "express";
import Room from "../models/Room.js";
import Player from "../models/Player.js";

const router = express.Router();

// 创建房间
router.post("/", async (req, res) => {
  try {
    const { name, players } = req.body;

    // 创建并保存所有玩家
    const savedPlayers = await Player.insertMany(players);

    // 创建房间，关联玩家
    const newRoom = new Room({
      name,
      players: savedPlayers.map((p) => p._id),
      status: "waiting",
    });

    const savedRoom = await newRoom.save();
    res.status(201).json(savedRoom);
  } catch (err) {
    console.error("创建房间失败:", err);
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
