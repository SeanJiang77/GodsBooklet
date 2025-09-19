import { GodRole } from "../engine/categories.js";

export class Witch extends GodRole {
  static get name() { return "witch"; }
  static get nightOrder() { return 40; }
  static get allowedActions() { return ["heal", "poison"]; }

  validate(action, targetSeat) {
    super.validate(action, targetSeat);
    if (action === "heal") {
      const isFirstNight = !!this.payload?.isFirstNight;
      const isSelfSave = this.actor.seat === targetSeat;
      if (isFirstNight && !this.rules.witchSelfSaveFirstNight && isSelfSave) {
        throw new Error("??????");
      }
    }
  }

  apply(action, targetSeat) {
    const t = this.room.players.find(p => p.seat === targetSeat);
    if (!t) return {};
    if (action === "heal") t.alive = true;
    if (action === "poison") t.alive = false;
    return { note: `??${action === "heal" ? "??" : "??"} ${targetSeat}` };
  }
}