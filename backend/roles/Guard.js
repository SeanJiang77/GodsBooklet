import { GodRole } from "../engine/categories.js";

export class Guard extends GodRole {
  static get name() { return "guard"; }
  static get nightOrder() { return 10; }
  static get allowedActions() { return ["protect"]; }

  validate(action, targetSeat) {
    super.validate(action, targetSeat);
    if (!this.rules.guardConsecutiveProtectAllowed) {
      const last = [...this.room.log].reverse().find(e => e.actor === "guard");
      if (last && last.targetSeat === targetSeat) {
        throw new Error("守卫不可连续守同一人");
      }
    }
  }

  apply(action, targetSeat) {
    const t = this.room.players.find(p => p.seat === targetSeat);
    if (t) t._guarded = true;
    return { note: `守护 ${targetSeat}` };
  }
}
