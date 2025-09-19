import { HttpError } from "../utils/errors.js";

// Resolve a full night in one pass and return a detailed summary
// actions = {
//   guard: { targetSeat },
//   wolves: { targetSeat },
//   seer: { targetSeat },
//   witch: { healTargetSeat, poisonTargetSeat, isFirstNight }
// }
// Assumptions:
// - 守卫只拦截狼人刀（不拦截女巫毒）
// - 女巫救针对狼人刀目标生效；毒无视守卫
// - 首夜自救规则受 room.rules.witchSelfSaveFirstNight 约束
// - 连续守同一人受 room.rules.guardConsecutiveProtectAllowed 约束
export function resolveNight(room, actions = {}) {
  const rules = room.rules || {};
  const players = room.players || [];

  const findSeat = (seat) => players.find((p) => p.seat === seat);
  const roleSeat = (role) => {
    const p = players.find((x) => x.role === role);
    return p ? p.seat : null;
  };

  // Extract inputs
  const guardTarget = actions?.guard?.targetSeat ?? null;
  const wolvesTarget = actions?.wolves?.targetSeat ?? null;
  const seerTarget = actions?.seer?.targetSeat ?? null;
  const witchHeal = actions?.witch?.healTargetSeat ?? null;
  const witchPoison = actions?.witch?.poisonTargetSeat ?? null;
  const isFirstNight = !!actions?.witch?.isFirstNight;

  // Validate seats if provided
  const seatsToCheck = [guardTarget, wolvesTarget, seerTarget, witchHeal, witchPoison].filter((n) => typeof n === "number");
  for (const s of seatsToCheck) {
    if (!findSeat(s)) throw new HttpError(404, `目标座位 ${s} 未找到`);
  }

  // Consecutive guard rule
  if (typeof guardTarget === "number" && !rules.guardConsecutiveProtectAllowed) {
    const last = [...(room.log || [])].reverse().find((e) => e.actor === "guard");
    if (last && last.targetSeat === guardTarget) {
      throw new HttpError(409, "不允许连续守护同一座位");
    }
  }

  // Witch first-night self-heal rule
  if (typeof witchHeal === "number") {
    const witchSeat = roleSeat("witch");
    if (isFirstNight && witchSeat != null && witchSeat === witchHeal && !rules.witchSelfSaveFirstNight) {
      throw new HttpError(409, "首夜禁止自救");
    }
  }

  // Prepare guards (clear previous _guarded flags)
  players.forEach((p) => (p._guarded = false));
  if (typeof guardTarget === "number") {
    const t = findSeat(guardTarget);
    if (t) t._guarded = true;
  }

  // Build resolution
  const attempted = {
    wolvesKill: typeof wolvesTarget === "number" ? wolvesTarget : null,
    guardProtect: typeof guardTarget === "number" ? guardTarget : null,
    witchHeal: typeof witchHeal === "number" ? witchHeal : null,
    witchPoison: typeof witchPoison === "number" ? witchPoison : null,
    seerCheck: typeof seerTarget === "number" ? seerTarget : null,
  };

  const prevented = { byGuard: false, byHeal: false };
  const killed = new Set();
  const survived = new Set();

  // Resolve wolves vs guard vs heal
  let sameProtectAndHeal = false;
  if (attempted.wolvesKill != null) {
    const victim = findSeat(attempted.wolvesKill);
    if (victim) {
      const guarded = !!victim._guarded;
      const healed = typeof witchHeal === "number" && witchHeal === attempted.wolvesKill;
      // 同守同救：守卫与女巫救都落在被刀者身上，则仍然死亡
      if (guarded && healed && guardTarget === victim.seat && witchHeal === victim.seat) {
        sameProtectAndHeal = true;
        killed.add(victim.seat);
      } else if (guarded) {
        prevented.byGuard = true;
      } else if (healed) {
        prevented.byHeal = true;
      } else {
        killed.add(victim.seat);
      }
    }
  }

  // Resolve poison (ignores guard)
  if (attempted.witchPoison != null) {
    killed.add(attempted.witchPoison);
  }

  // Compute final state changes
  const killedList = [...killed];
  killedList.forEach((seat) => {
    const p = findSeat(seat);
    if (p) p.alive = false;
  });

  // Survivors explicitly marked
  const survivorsCandidates = [attempted.wolvesKill, attempted.witchHeal].filter((n) => typeof n === "number");
  survivorsCandidates.forEach((seat) => {
    if (!killed.has(seat)) survived.add(seat);
  });

  const summary = {
    attempted,
    prevented,
    killed: killedList,
    survived: [...survived],
    extra: sameProtectAndHeal ? { sameProtectAndHeal: guardTarget } : {},
  };

  return summary;
}
