import express from "express";
import Room from "../models/room.js";
import { HttpError } from "../utils/errors.js";
import { performAction } from "../engine/actions.js";
import { PHASE_ACTORS, nextPhase } from "../engine/phases.js";
import { isGameOver } from "../engine/gameover.js";
import { PRESETS, totalRoles, nonVillagerCount, finalizeRoleConfig } from "../utils/presets.js";

const router = express.Router();

/** 生成唯一昵称：玩家#N */
function generateNickname(room) {
  const existing = new Set(room.players.map(p => p.nickname));
  let i = room.players.length + 1;
  while (true) {
    const name = `玩家#${i}`;
    if (!existing.has(name)) return name;
    i++;
  }
}

/** 分配最小可用座位（从 1 开始） */
function nextAvailableSeat(players, maxSeats) {
  const used = new Set(players.map(p => p.seat));
  for (let s = 1; s <= maxSeats; s++) if (!used.has(s)) return s;
  return null;
}

/** 校验 roles 与玩家数量关系，并随机分配 */
function validateRolesAgainstPlayers(roles, playersCount) {
  const needed = totalRoles(roles);
  if (playersCount < needed) {
    throw new HttpError(400, `玩家数量不足，至少需要 ${needed} 名玩家来匹配所有身份`);
  }
}
function assignRolesRandomly(players, roles) {
  const bag = [];
  Object.entries(roles).forEach(([role, count]) => {
    for (let i = 0; i < count; i++) bag.push(role);
  });
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  const sorted = [...players].sort((a, b) => a.seat - b.seat);
  for (let i = 0; i < bag.length; i++) sorted[i].role = bag[i];
  for (let i = bag.length; i < sorted.length; i++) sorted[i].role = "villager";
  return sorted;
}

/** 统一计算 Lobby 元信息与是否 ready */
function injectMeta(room, mode = "flex") {
  const base = room.rolesConfig && Object.keys(room.rolesConfig).length
    ? room.rolesConfig
    : room.presetKey ? PRESETS[room.presetKey]
    : {};

  const playersCount = room.players.length;
  const fin = finalizeRoleConfig(base, playersCount, mode);
  const expectedPlayers = fin.error ? totalRoles(base) : fin.expectedPlayers;
  const playersNeeded = Math.max(0, expectedPlayers - playersCount);

  const issues = [];
  if (playersCount === 0) issues.push("尚未添加玩家");
  if (mode === "strict") {
    const expectedStrict = totalRoles(base);
    if (playersCount !== expectedStrict) {
      issues.push(`严格模式：玩家数(${playersCount}) ≠ 预设总数(${expectedStrict})`);
    }
  } else {
    const mustHave = nonVillagerCount ? nonVillagerCount(base) : (totalRoles(base) - (base.villager || 0));
    if (playersCount < mustHave) {
      issues.push(`人数不足：至少需要非村民共 ${mustHave} 人`);
    }
  }
  const seats = room.players.map(p => p.seat);
  if (new Set(seats).size !== seats.length) issues.push("存在重复座位号");
  if (seats.some(s => s < 1 || s > room.maxSeats)) issues.push("存在非法座位号（越界）");
  if (room.players.some(p => !p.nickname)) issues.push("存在空昵称");

  room.meta = {
    expectedPlayers,
    playersNeeded,
    phaseAllowedActors: PHASE_ACTORS[room.status] || [],
    mode,
    ready: issues.length === 0,
    readyIssues: issues,
    minPlayers: Math.max(4, nonVillagerCount ? nonVillagerCount(base) : 0),
    currentPlayers: playersCount,
  };
}

// ====== 基础：创建与读取 ======
router.post("/", async (req, res, next) => {
  try {
    const { name = "", maxSeats, rules = {}, presetKey, roles, players = [], mode = "flex" } = req.body;
    if (!maxSeats || maxSeats < 4) throw new HttpError(400, "maxSeats 至少为 4");
    const baseRoles = presetKey ? PRESETS[presetKey] : (roles || {});
    if (!baseRoles || !Object.keys(baseRoles).length) throw new HttpError(400, "未知的 presetKey 或缺少 roles");

    const doc = await Room.create({
      name, maxSeats, rules, players,
      status: "init", log: [],
      presetKey: presetKey || null,
      rolesConfig: baseRoles,
    });
    injectMeta(doc, mode);
    await doc.save();
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
});

// ====== Lobby：玩家管理 ======
router.post("/:id/players", async (req, res, next) => {
  try {
    const { seat: seatRaw, nickname: nickRaw } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby 已锁定，禁止修改人员");
    if (room.players.length >= room.maxSeats) throw new HttpError(409, "房间人数已满");

    const seat = typeof seatRaw === "number" ? seatRaw : nextAvailableSeat(room.players, room.maxSeats);
    if (!seat) throw new HttpError(409, "无可用座位");
    if (room.players.find(p => p.seat === seat)) throw new HttpError(409, "该座位已被占用");

    const nickname = (nickRaw && String(nickRaw).trim()) || generateNickname(room);
    // 昵称去重
    let finalName = nickname;
    const exists = new Set(room.players.map(p => p.nickname));
    let i = 2;
    while (exists.has(finalName)) finalName = `${nickname}-${i++}`;

    room.players.push({ seat, nickname: finalName, role: null, alive: true });
    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.status(201).json(room);
  } catch (err) { next(err); }
});

router.patch("/:id/players/:seat", async (req, res, next) => {
  try {
    const seat = Number(req.params.seat);
    const { nickname, newSeat } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby 已锁定，禁止修改人员");

    const p = room.players.find(x => x.seat === seat);
    if (!p) throw new HttpError(404, `座位 ${seat} 不存在`);

    if (typeof newSeat === "number") {
      if (newSeat < 1 || newSeat > room.maxSeats) throw new HttpError(400, "新座位越界");
      if (room.players.some(x => x.seat === newSeat)) throw new HttpError(409, "新座位已被占用");
      p.seat = newSeat;
    }
    if (typeof nickname === "string") {
      const trimmed = nickname.trim();
      if (!trimmed) throw new HttpError(400, "昵称不能为空");
      if (room.players.some(x => x !== p && x.nickname === trimmed)) {
        return next(new HttpError(409, "昵称已存在"));
      }
      p.nickname = trimmed;
    }

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
});

router.delete("/:id/players/:seat", async (req, res, next) => {
  try {
    const seat = Number(req.params.seat);
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby 已锁定，禁止修改人员");

    const before = room.players.length;
    room.players = room.players.filter(p => p.seat !== seat);
    if (room.players.length === before) throw new HttpError(404, "目标座位不存在");

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
});

router.post("/:id/players/bulk", async (req, res, next) => {
  try {
    const { count = 1 } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby 已锁定，禁止修改人员");

    let added = 0;
    for (let i = 0; i < count; i++) {
      if (room.players.length >= room.maxSeats) break;
      const seat = nextAvailableSeat(room.players, room.maxSeats);
      if (!seat) break;
      const nickname = generateNickname(room);
      room.players.push({ seat, nickname, role: null, alive: true });
      added++;
    }

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.status(201).json({ room, added });
  } catch (err) { next(err); }
});

// ====== 设置与锁定 ======
router.patch("/:id/settings", async (req, res, next) => {
  try {
    const { presetKey, roles, rules, mode } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby 已锁定，禁止修改设置");
    if (typeof rules === "object") room.rules = { ...room.rules, ...rules };
    if (presetKey) {
      if (!PRESETS[presetKey]) throw new HttpError(400, "未知的 presetKey");
      room.presetKey = presetKey;
      room.rolesConfig = PRESETS[presetKey];
    } else if (roles && Object.keys(roles).length) {
      room.presetKey = null;
      room.rolesConfig = roles;
    }
    injectMeta(room, mode || room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
});

router.post("/:id/lobby-lock", async (req, res, next) => {
  try {
    const { locked = true } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    room.lobbyLocked = !!locked;
    await room.save();
    res.json({ lobbyLocked: room.lobbyLocked });
  } catch (err) { next(err); }
});

// ====== 分配身份（开局） ======
router.post("/:id/assign", async (req, res, next) => {
  try {
    const { roles, presetKey, mode = "flex" } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (!room.players.length) throw new HttpError(400, "请先添加玩家");

    injectMeta(room, mode);
    if (!room.meta.ready) {
      return next(new HttpError(409, `未满足开局条件：${room.meta.readyIssues.join("；")}`));
    }

    const base = presetKey ? PRESETS[presetKey] : (roles || room.rolesConfig);
    if (!base || !Object.keys(base).length) throw new HttpError(400, "未知的 presetKey 或缺少 roles");

    const fin = finalizeRoleConfig(base, room.players.length, mode);
    if (fin.error) throw new HttpError(400, fin.error);

    validateRolesAgainstPlayers(fin.final, room.players.length);
    room.players = assignRolesRandomly(room.players, fin.final);
    room.status = "night";
    room.rolesConfig = fin.final;
    room.presetKey = presetKey || room.presetKey || null;
    room.log.push({ phase: "night", actor: "system", note: "分配角色并进入首夜" });
    injectMeta(room, mode);
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
});

// ====== 行动与撤销 ======
router.post("/:id/step", async (req, res, next) => {
  try {
    const { actor, actorSeat, action, targetSeat, payload } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.status === "end") throw new HttpError(409, "游戏已结束");

    if (actor === "system" && action === "advancePhase") {
      room.status = nextPhase(room.status);
      room.log.push({ phase: room.status, actor: "system", note: "推进阶段" });
    } else {
      const allowed = PHASE_ACTORS[room.status] || [];
      if (!allowed.includes(actor)) throw new HttpError(409, `阶段(${room.status})不允许 ${actor} 行动`);
      performAction(room, { actorSeat, action, targetSeat, payload });
    }

    const result = isGameOver(room.players);
    if (result.over) {
      room.status = "end";
      room.log.push({ phase: "end", actor: "system", note: `游戏结束，胜方：${result.winner}` });
    }

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
});

router.post("/:id/undo", async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    const ev = room.log.id(eventId);
    if (!ev) throw new HttpError(404, "事件不存在");
    room.log.push({ phase: room.status, actor: "system", note: "撤销事件", undoOf: ev._id });
    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) { next(err); }
});

export default router;
