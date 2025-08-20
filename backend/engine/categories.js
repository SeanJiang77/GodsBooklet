import { Role } from "./role.js";

export class GodRole extends Role {
  static get team() { return "good"; }
  static get nightOrder() { return 30; }
  static isActionPhaseOk(phase, action) { return phase === "night"; }
  validate(action, targetSeat) {
    if (typeof targetSeat === "number") {
      const t = this.room.players.find(p => p.seat === targetSeat);
      if (!t) throw new Error("目标不存在");
      if (!t.alive) throw new Error("目标已阵亡");
    }
  }
}

export class VillagerRole extends Role {
  static get team() { return "good"; }
  static get allowedActions() { return []; }
  static get nightOrder() { return 90; }
  static isActionPhaseOk() { return false; }
}

export class WolfRole extends Role {
  static get team() { return "werewolf"; }
  static get nightOrder() { return 20; }
  static get allowedActions() { return ["kill"]; }
  static isActionPhaseOk(phase) { return phase === "night"; }
  validate(action, targetSeat) {
    if (action !== "kill") return;
    const t = this.room.players.find(p => p.seat === targetSeat);
    if (!t) throw new Error("目标不存在");
  }
}
