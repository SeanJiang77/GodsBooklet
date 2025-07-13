

import express from "express";

const router = express.Router();

// 示例：获取所有玩家（开发测试用）
router.get("/", async (req, res) => {
  try {
    // 模拟数据（后期可连接数据库）
    const players = [
      { id: 1, name: "玩家1", role: "村民" },
      { id: 2, name: "玩家2", role: "狼人" },
    ];
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: "无法获取玩家信息" });
  }
});

// 示例：添加玩家（开发测试用）
router.post("/", async (req, res) => {
  try {
    const { name, role } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: "缺少必要字段" });
    }
    // 模拟成功创建
    res.status(201).json({ message: "玩家已添加", player: { name, role } });
  } catch (err) {
    res.status(500).json({ error: "添加玩家失败" });
  }
});

export default router;