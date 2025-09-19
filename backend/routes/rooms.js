import express from "express";
import Room from "../models/room.js";
import { HttpError } from "../utils/errors.js";
import { performAction } from "../engine/actions.js";
import { PHASE_ACTORS, nextPhase } from "../engine/phases.js";
import { isGameOver } from "../engine/gameover.js";
import { PRESETS, totalRoles, nonVillagerCount, finalizeRoleConfig } from "../utils/presets.js";
import { resolveNight } from "../services/nightService.js";

const router = express.Router();

function toPlainRoles(mapOrObj) {
  if (!mapOrObj) return {};
  // Detect Map (has forEach and size, but plain objects don't)
  if (typeof mapOrObj.forEach === "function" && typeof mapOrObj.size === "number") {
    return Object.fromEntries(mapOrObj);
  }
  return mapOrObj;
}

function nextAvailableSeat(players, maxSeats) {
  const used = new Set(players.map((p) => p.seat));
  for (let s = 1; s <= maxSeats; s++) if (!used.has(s)) return s;
  return null;
}

function validateRolesAgainstPlayers(roles, playersCount) {
  const needed = totalRoles(roles);
  if (playersCount < needed) {
    throw new HttpError(400, `Players (${playersCount}) fewer than roles required (${needed}).`);
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

function injectMeta(room, mode = "flex") {
  const base =
    (room.rolesConfig && Object.keys(toPlainRoles(room.rolesConfig)).length
      ? toPlainRoles(room.rolesConfig)
      : room.presetKey
      ? PRESETS[room.presetKey]
      : {}) || {};

  const playersCount = room.players.length;
  const fin = finalizeRoleConfig(base, playersCount, mode);
  const expectedPlayers = fin.error ? totalRoles(base) : fin.expectedPlayers;
  const playersNeeded = Math.max(0, expectedPlayers - playersCount);

  const issues = [];
  if (playersCount === 0) issues.push("No players added yet");
  if (mode === "strict") {
    const expectedStrict = totalRoles(base);
    if (playersCount !== expectedStrict) {
      issues.push(`Strict mode requires exactly ${expectedStrict} players (got ${playersCount})`);
    }
  } else {
    const mustHave = nonVillagerCount ? nonVillagerCount(base) : totalRoles(base) - (base.villager || 0);
    if (playersCount < mustHave) {
      issues.push(`Players must be >= non-villager count (${mustHave})`);
    }
  }
  const seats = room.players.map((p) => p.seat);
  if (new Set(seats).size !== seats.length) issues.push("Duplicate seats detected");
  if (seats.some((s) => s < 1 || s > room.maxSeats)) issues.push("Seat out of range");
  if (room.players.some((p) => !p.nickname)) issues.push("Nickname missing for some players");

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

// Create a room
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
      configType, // 'classic' | 'custom'
      playerCount,
    } = req.body || {};

    if (!maxSeats || maxSeats < 4) throw new HttpError(400, "maxSeats must be >= 4");

    const baseRoles = presetKey ? PRESETS[presetKey] : roles || {};
    if (!baseRoles || !Object.keys(baseRoles).length) {
      throw new HttpError(400, "Provide presetKey or roles");
    }

    let seedPlayers = Array.isArray(players) && players.length ? players : [];
    if (seedPlayers.length === 0 && Number.isFinite(+initialPlayers) && initialPlayers > 0) {
      const count = Math.min(Number(initialPlayers), maxSeats);
      for (let i = 1; i <= count; i++) {
        seedPlayers.push({ seat: i, nickname: `Player ${i}`, role: null, alive: true });
      }
    } else if (seedPlayers.length > 0) {
      seedPlayers = seedPlayers.map((p, idx) => {
        const seat = typeof p.seat === "number" ? p.seat : idx + 1;
        const nick = typeof p.nickname === "string" && p.nickname.trim().length > 0 ? p.nickname.trim() : `Player ${seat}`;
        return { seat, nickname: nick, role: p.role ?? null, alive: typeof p.alive === "boolean" ? p.alive : true };
      });
    }

    const resolvedConfigType = typeof configType === "string" && ["classic", "custom"].includes(configType)
      ? configType
      : presetKey ? "classic" : "custom";

    let resolvedPlayerCount = Number.isInteger(playerCount)
      ? playerCount
      : Number.isInteger(maxSeats)
      ? maxSeats
      : seedPlayers.length;

    if (!Number.isInteger(resolvedPlayerCount) || resolvedPlayerCount < 1) {
      throw new HttpError(400, "playerCount must be >= 1");
    }
    if (resolvedPlayerCount > maxSeats) {
      throw new HttpError(400, `playerCount(${resolvedPlayerCount}) exceeds maxSeats(${maxSeats})`);
    }

    const doc = await Room.create({
      name,
      rules,
      maxSeats,
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

// Get room
router.get("/:id", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");
    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Assign roles and start night
router.post("/:id/assign", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");
    if (room.status !== "init") throw new HttpError(409, "Room already started");

    const plainRoles = toPlainRoles(room.rolesConfig);
    validateRolesAgainstPlayers(plainRoles, room.players.length);
    room.players = assignRolesRandomly(room.players, plainRoles);
    room.status = "night";

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Update a player's seat or nickname
router.patch("/:id/players/:seat", async (req, res, next) => {
  try {
    const seat = Number(req.params.seat);
    const { nickname, newSeat } = req.body || {};
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby is locked");

    const p = room.players.find((x) => x.seat === seat);
    if (!p) throw new HttpError(404, `Seat ${seat} not found`);

    if (typeof newSeat === "number") {
      if (newSeat < 1 || newSeat > room.maxSeats) throw new HttpError(400, "Seat out of range");
      if (room.players.some((x) => x.seat === newSeat)) throw new HttpError(409, "Seat already taken");
      p.seat = newSeat;
    }
    if (typeof nickname === "string") {
      const v = nickname.trim();
      p.nickname = v.length > 0 ? v : `Player ${p.seat}`;
    }

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Remove a player by seat
router.delete("/:id/players/:seat", async (req, res, next) => {
  try {
    const seat = Number(req.params.seat);
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby is locked");

    const before = room.players.length;
    room.players = room.players.filter((p) => p.seat !== seat);
    if (room.players.length === before) throw new HttpError(404, "Seat not found");

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Bulk add N players (auto seats)
router.post("/:id/players/bulk", async (req, res, next) => {
  try {
    const { count = 1 } = req.body || {};
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby is locked");

    let added = 0;
    for (let i = 0; i < count; i++) {
      if (room.players.length >= room.maxSeats) break;
      const seat = nextAvailableSeat(room.players, room.maxSeats);
      if (!seat) break;
      room.players.push({ seat, nickname: `Player ${seat}`, role: null, alive: true });
      added++;
    }

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.status(201).json({ room, added });
  } catch (err) {
    next(err);
  }
});

// Add single player
router.post("/:id/players", async (req, res, next) => {
  try {
    const { seat: seatRaw, nickname } = req.body || {};
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");
    if (room.lobbyLocked) throw new HttpError(409, "Lobby is locked");

    let seat = typeof seatRaw === "number" ? seatRaw : nextAvailableSeat(room.players, room.maxSeats);
    if (!seat) throw new HttpError(409, "No available seats");
    if (seat < 1 || seat > room.maxSeats) throw new HttpError(400, "Seat out of range");
    if (room.players.some((p) => p.seat === seat)) throw new HttpError(409, "Seat already taken");

    const name = typeof nickname === "string" && nickname.trim().length > 0 ? nickname.trim() : `Player ${seat}`;
    room.players.push({ seat, nickname: name, role: null, alive: true });

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

// Step: actions and phase advance
router.post("/:id/step", async (req, res, next) => {
  try {
    const { actor, actorSeat, action, targetSeat, payload } = req.body || {};
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");

    if (actor === "system" && action === "advancePhase") {
      room.log.push({ at: new Date(), phase: room.status, actor: "system", targetSeat: null, payload: { action }, note: "advance" });
      room.status = nextPhase(room.status);
      const over = isGameOver(room.players);
      if (over.over) room.status = "end";
      injectMeta(room, room.meta?.mode || "flex");
      await room.save();
      return res.json(room);
    }

    // For wolf pack convenience, pick a valid werewolf seat if needed
    let seatNum = typeof actorSeat === "number" ? actorSeat : null;
    if (actor === "werewolves") {
      const wolf = room.players.find((p) => p.alive && p.role === "werewolf");
      if (wolf) seatNum = wolf.seat;
    }
    if (seatNum == null) throw new HttpError(400, "actorSeat is required");

    performAction(room, { actorSeat: seatNum, action, targetSeat, payload });

    const over = isGameOver(room.players);
    if (over.over) room.status = "end";

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// Undo: only last event with simple inverse
function prevPhase(curr) {
  const order = ["init", "night", "day", "vote"];
  const idx = order.indexOf(curr);
  return idx <= 0 ? "init" : order[idx - 1];
}

router.post("/:id/undo", async (req, res, next) => {
  try {
    const { eventId } = req.body || {};
    if (!eventId) throw new HttpError(400, "eventId required");
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");
    if (!Array.isArray(room.log) || room.log.length === 0) throw new HttpError(409, "No events to undo");

    const last = room.log[room.log.length - 1];
    if (!last || String(last._id) !== String(eventId)) {
      throw new HttpError(409, "Only the latest event can be undone");
    }

    const act = last?.payload?.action;
    const t = typeof last.targetSeat === "number" ? room.players.find((p) => p.seat === last.targetSeat) : null;
    if (act === "kill" && t) t.alive = true;
    if (act === "heal" && t) t.alive = false;
    if (act === "protect" && t) t._guarded = false;
    if (act === "advancePhase") room.status = prevPhase(room.status);

    room.log.pop();

    const over = isGameOver(room.players);
    if (over.over) room.status = "end"; else if (room.status === "end") room.status = "day";

    injectMeta(room, room.meta?.mode || "flex");
    await room.save();
    res.json(room);
  } catch (err) {
    next(err);
  }
});

export default router;

// Night fast-forward: resolve full night in one pass and provide summary
router.post("/:id/night/resolve", async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) throw new HttpError(404, "Room not found");
    if (room.status !== "night") throw new HttpError(409, "Not in night phase");

    const actions = req.body || {};
    const summary = resolveNight(room, actions);

    // Append detailed logs
    const now = new Date();
    const push = (actor, payload, targetSeat, note) => {
      room.log.push({ at: now, phase: room.status, actor, targetSeat: targetSeat ?? null, payload, note });
    };

    if (typeof actions?.guard?.targetSeat === "number") {
      push("guard", { action: "protect" }, actions.guard.targetSeat, `守卫守护 ${actions.guard.targetSeat}`);
    }
    if (typeof actions?.wolves?.targetSeat === "number") {
      push("werewolf", { action: "kill" }, actions.wolves.targetSeat, `狼人击杀目标 ${actions.wolves.targetSeat}`);
    }
    if (typeof actions?.seer?.targetSeat === "number") {
      const t = room.players.find((p) => p.seat === actions.seer.targetSeat);
      const isWolf = t?.role === "werewolf";
      push("seer", { action: "check" }, actions.seer.targetSeat, `预言家查验 ${actions.seer.targetSeat}=${isWolf ? "狼人" : "好人"}`);
    }
    if (typeof actions?.witch?.healTargetSeat === "number") {
      push("witch", { action: "heal" }, actions.witch.healTargetSeat, `女巫救起 ${actions.witch.healTargetSeat}`);
    }
    if (typeof actions?.witch?.poisonTargetSeat === "number") {
      push("witch", { action: "poison" }, actions.witch.poisonTargetSeat, `女巫毒杀 ${actions.witch.poisonTargetSeat}`);
    }

    // Night summary
    room.log.push({ at: new Date(), phase: room.status, actor: "system", targetSeat: null, payload: { action: "nightSummary", summary }, note: "夜晚结算" });

    // Optionally advance to day
    if (actions?.advanceToDay) {
      room.status = "day";
    }

    await room.save();
    res.json({ room, summary });
  } catch (err) {
    next(err);
  }
});
