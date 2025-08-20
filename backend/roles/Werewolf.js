// backend/roles/Werewolf.js
import { WolfRole } from "../engine/categories.js";

/**
 * 狼人（夜间击杀）
 * - 继承狼阵营通用规则（夜间行动、allowedActions=["kill"] 等）
 * - 仅在收到 action=="kill" 时对目标生效
 */
export class Werewolf extends WolfRole {
  static get name() { return "werewolf"; }

  apply(action, targetSeat) {
    if (action !== "kill") return {};
    const t = this.room.players.find(p => p.seat === targetSeat);
    if (t) t.alive = false;
    return { note: `狼人击杀了 ${targetSeat}` };
  }
}