// routes/rooms.js
// Matches your Sprint backlog endpoints (S1–S3).
import express from "express";
import Room from "../models/room.js";
import { PRESETS } from "../utils/presets.js";
import { HttpError } from "../utils/errors.js";
import { validateRolesAgainstPlayers, assignRolesRandomly } from "../services/roleService.js";
import { nextPhase, checkGuardConsecutive, checkWitchSelfSave, isGameOver } from "../services/flowService.js";

const router = express.Router();

// POST /rooms - create room
router.post("/", async (req, res, next) => {
  try {
    const { name = "", maxSeats, rules = {}, presetKey, roles, players = [] } = req.body;
    if (!maxSeats || maxSeats < 4) throw new HttpError(400, "maxSeats 至少为 4");

    const roleConfig = presetKey ? PRESETS[presetKey] : (roles || {});
    if (!roleConfig) throw new HttpError(400, "未知的 presetKey 或缺少 roles");

    if (players.length) validateRolesAgainstPlayers(roleConfig, players.length);

    const doc = await Room.create({
      name,
      maxSeats,
      rules,
      players,
      status: "init",
      log: [],
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// GET /rooms/:id - fetch room
router.get("/:id", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// POST /rooms/:id/players - add player
router.post("/:id/players", async (req, res, next) => {
  try {
    const { seat, nickname } = req.body;
    if (!seat || !nickname) throw new HttpError(400, "seat 与 nickname 必填");
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.players.find(p => p.seat === seat)) throw new HttpError(409, "该座位已被占用");
    if (room.players.length >= room.maxSeats) throw new HttpError(409, "房间人数已满");
    room.players.push({ seat, nickname, role: null, alive: true });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

// POST /rooms/:id/assign - assign roles randomly
router.post("/:id/assign", async (req, res, next) => {
  try {
    const { roles, presetKey } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (!room.players.length) throw new HttpError(400, "请先添加玩家");

    const roleConfig = presetKey ? PRESETS[presetKey] : (roles || {});
    if (!roleConfig) throw new HttpError(400, "未知的 presetKey 或缺少 roles");

    validateRolesAgainstPlayers(roleConfig, room.players.length);
    room.players = assignRolesRandomly(room.players, roleConfig);
    room.status = "night";
    room.log.push({ phase: "night", actor: "system", note: "分配角色并进入首夜" });
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// POST /rooms/:id/step - perform action & log
router.post("/:id/step", async (req, res, next) => {
  try {
    const { actor, action, targetSeat, isSelfSave = false, isFirstNight = false } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.status === "end") throw new HttpError(409, "游戏已结束");

    if (actor === "guard" && typeof targetSeat === "number") {
      checkGuardConsecutive(room.rules.guardConsecutiveProtectAllowed, room.log, targetSeat);
    }
    if (actor === "witch" && action === "heal") {
      checkWitchSelfSave(room.rules.witchSelfSaveFirstNight, isFirstNight, isSelfSave);
    }

    room.log.push({ phase: room.status === "init" ? "night" : room.status, actor, targetSeat, payload: { action, isSelfSave, isFirstNight } });

    if (actor === "system" && action === "advancePhase") {
      room.status = nextPhase(room.status);
    }

    if (actor === "werewolves" && typeof targetSeat === "number") {
      const t = room.players.find(p => p.seat === targetSeat);
      if (t) t.alive = false;
    }
    if (actor === "witch" && action === "heal" && typeof targetSeat === "number") {
      const t = room.players.find(p => p.seat === targetSeat);
      if (t) t.alive = true;
    }

    const result = isGameOver(room.players);
    if (result.over) {
      room.status = "end";
      room.log.push({ phase: "end", actor: "system", note: `游戏结束，胜方：${result.winner}` });
    }

    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// POST /rooms/:id/undo - simple undo marker
router.post("/:id/undo", async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    const ev = room.log.id(eventId);
    if (!ev) throw new HttpError(404, "事件不存在");

    room.log.push({ phase: room.status, actor: "system", note: "撤销事件", undoOf: ev._id });
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

export default router;
