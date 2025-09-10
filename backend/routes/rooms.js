// backend/routes/room.js
import express from "express";
import Room from "../models/room.js";
import { HttpError } from "../utils/errors.js";
import { performAction } from "../engine/actions.js";
import { PHASE_ACTORS, nextPhase } from "../engine/phases.js";
import { isGameOver } from "../engine/gameover.js";
import { PRESETS, totalRoles, nonVillagerCount, finalizeRoleConfig } from "../utils/presets.js";

const router = express.Router();

/** 分配最小可用座位（从 1 开始） */
function nextAvailableSeat(players, maxSeats) {
  const used = new Set(players.map((p) => p.seat));
  for (let s = 1; s <= maxSeats; s++) if (!used.has(s)) return s;
  return null;
}

/** 校验 roles 与玩家数量关系，并随机分配（保留以便后续使用） */
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
  const base =
    (room.rolesConfig && Object.keys(room.rolesConfig).length
      ? room.rolesConfig
      : room.presetKey
      ? PRESETS[room.presetKey]
      : {}) || {};

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
    const mustHave = nonVillagerCount ? nonVillagerCount(base) : totalRoles(base) - (base.villager || 0);
    if (playersCount < mustHave) {
      issues.push(`人数不足：至少需要非村民共 ${mustHave} 人`);
    }
  }
  const seats = room.players.map((p) => p.seat);
  if (new Set(seats).size !== seats.length) issues.push("存在重复座位号");
  if (seats.some((s) => s < 1 || s > room.maxSeats)) issues.push("存在非法座位号（越界）");
  if (room.players.some((p) => !p.nickname)) issues.push("存在空昵称");

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
    const {
      name = "",
      maxSeats,
      rules = {},
      presetKey,
      roles,
      mode = "flex",
      initialPlayers = 0,
      players = [],
      // 这两个是模型必填，如果前端没传，这里会自动推导/兜底
      configType,   // 'classic' | 'custom'
      playerCount,  // 期望/容量人数
    } = req.body;

    // ---------- 基础校验 ----------
    if (!maxSeats || maxSeats < 4) {
      throw new HttpError(400, "maxSeats 至少为 4");
    }

    const baseRoles = presetKey ? PRESETS[presetKey] : (roles || {});
    if (!baseRoles || !Object.keys(baseRoles).length) {
      throw new HttpError(400, "未知的 presetKey 或缺少 roles");
    }

    // ---------- 生成/规范化初始玩家 ----------
    let seedPlayers = Array.isArray(players) && players.length ? players : [];
    if (seedPlayers.length === 0 && Number.isFinite(+initialPlayers) && initialPlayers > 0) {
      const count = Math.min(Number(initialPlayers), maxSeats);
      for (let i = 1; i <= count; i++) {
        seedPlayers.push({
          seat: i,
          nickname: `Player ${i}`, // 始终非空，避免 schema 报错
          role: null,
          alive: true,
        });
      }
    } else if (seedPlayers.length > 0) {
      // 规范化传入玩家：空白昵称回退默认
      seedPlayers = seedPlayers.map((p, idx) => {
        const seat = typeof p.seat === "number" ? p.seat : (idx + 1);
        const nick =
          typeof p.nickname === "string" && p.nickname.trim().length > 0
            ? p.nickname.trim()
            : `Player ${seat}`;
        return {
          seat,
          nickname: nick,
          role: p.role ?? null,
          alive: typeof p.alive === "boolean" ? p.alive : true,
        };
      });
    }

    // ---------- 统一推导并校验 configType / playerCount ----------
    // 若前端没传 configType，则：有 presetKey 的当作 'classic'，否则 'custom'
    const resolvedConfigType =
      typeof configType === "string" && ["classic", "custom"].includes(configType)
        ? configType
        : (presetKey ? "classic" : "custom");

    // 若前端没传 playerCount，则用 maxSeats 作为容量（更合理，也最不容易冲突）
    let resolvedPlayerCount =
      Number.isInteger(playerCount) ? playerCount : Number.isInteger(maxSeats) ? maxSeats : seedPlayers.length;

    if (!Number.isInteger(resolvedPlayerCount) || resolvedPlayerCount < 1) {
      throw new HttpError(400, "playerCount 必须为 >=1 的整数");
    }
    if (resolvedPlayerCount > maxSeats) {
      // playerCount 表示期望/容量人数，不应超过 maxSeats
      throw new HttpError(400, `playerCount(${resolvedPlayerCount}) 不应大于 maxSeats(${maxSeats})`);
    }

    // ---------- 创建入库 ----------
    const doc = await Room.create({
      name,
      rules,
      maxSeats,
      // 关键：把 schema 必填的两个字段写进去
      configType: resolvedConfigType,
      playerCount: resolvedPlayerCount,

      players: seedPlayers,
      status: "init",
      log: [],
      presetKey: presetKey || null,
      rolesConfig: baseRoles,
    });

    injectMeta(doc, mode);
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});


router.get("/:id", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// ====== 分配角色 ======
router.post("/:id/assign", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.status !== "init") {
      throw new HttpError(409, "房间已开始，不能重新分配角色");
    }

    // 校验人数是否足够
    validateRolesAgainstPlayers(room.rolesConfig, room.players.length);

    // 随机分配角色
    room.players = assignRolesRandomly(room.players, room.rolesConfig);

    // 更新状态：进入首夜
    room.status = "night";

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();

    res.json(room);
  } catch (err) {
    next(err);
  }
});


// ====== Lobby：玩家管理 ======
// ====== 分配角色 ======
router.post("/:id/assign", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.status !== "init") {
      throw new HttpError(409, "房间已开始，不能重新分配角色");
    }

    // 校验人数是否足够
    validateRolesAgainstPlayers(room.rolesConfig, room.players.length);

    // 随机分配角色
    room.players = assignRolesRandomly(room.players, room.rolesConfig);

    // 更新状态：进入首夜
    room.status = "night";

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();

    res.json(room);
  } catch (err) {
    next(err);
  }
});


router.patch("/:id/players/:seat", async (req, res, next) => {
  try {
    const seat = Number(req.params.seat);
    const { nickname, newSeat } = req.body;
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby 已锁定，禁止修改人员");

    const p = room.players.find((x) => x.seat === seat);
    if (!p) throw new HttpError(404, `座位 ${seat} 不存在`);

    if (typeof newSeat === "number") {
      if (newSeat < 1 || newSeat > room.maxSeats) throw new HttpError(400, "新座位越界");
      if (room.players.some((x) => x.seat === newSeat)) throw new HttpError(409, "新座位已被占用");
      p.seat = newSeat;
    }
    if (typeof nickname === "string") {
      const v = nickname.trim();
      p.nickname = v.length > 0 ? v : `Player ${p.seat}`; // 空名回退默认
    }

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/players/:seat", async (req, res, next) => {
  try {
    const seat = Number(req.params.seat);
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "房间不存在");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby 已锁定，禁止修改人员");

    const before = room.players.length;
    room.players = room.players.filter((p) => p.seat !== seat);
    if (room.players.length === before) throw new HttpError(404, "目标座位不存在");

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
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
      room.players.push({
        seat,
        nickname: `Player ${seat}`, // 批量添加时也使用默认非空昵称
        role: null,
        alive: true,
      });
      added++;
    }

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.status(201).json({ room, added });
  } catch (err) {
    next(err);
  }
});

// ====== 设置与锁定、分配、行动、撤销 等其它路由保持原样（如你已有，实现处略） ======
  
export default router;
