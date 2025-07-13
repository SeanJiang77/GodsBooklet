import express from "express";
import Room from "../models/Room.js";
import Player from "../models/Player.js";

const router = express.Router();

// 创建房间
router.post("/", async (req, res, next) => {
  try {
    const { playerCount, roles } = req.body;
    const totalRoles = Object.values(roles || {})
      .reduce((sum, num) => sum + Number(num), 0);

    // 校验：玩家数必须 >= 身份总数
    if (playerCount < totalRoles) {
      const err = new Error(`玩家数量不足，至少需要 ${totalRoles} 人`);
      err.status = 400;
      return next(err);
    }

    const room = new Room(req.body);
    const saved = await room.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
});

// 获取房间
router.get("/:id", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      const err = new Error("房间未找到");
      err.status = 404;
      return next(err);
    }
    res.json({ success: true, data: room });
  } catch (err) {
    next(err);
  }
});

export default router;
