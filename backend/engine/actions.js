import { createRoleInstance } from "./registry.js";
import { HttpError } from "../utils/errors.js";

export function performAction(room, { actorSeat, action, targetSeat, payload }) {
  const actor = room.players.find(p => p.seat === actorSeat);
  if (!actor) throw new HttpError(404, `?? ${actorSeat} ???`);
  if (!actor.alive) throw new HttpError(409, `?? ${actorSeat} ??????`);
  if (!actor.role) throw new HttpError(409, `?? ${actorSeat} ????`);

  const roleInst = createRoleInstance(actor.role, { room, actor, rules: room.rules, payload });
  const RoleClass = roleInst.constructor;

  if (!RoleClass.allowedActions.includes(action)) {
    throw new HttpError(400, `${actor.role} ????? ${action}`);
  }
  if (!RoleClass.isActionPhaseOk(room.status, action)) {
    throw new HttpError(409, `???? ${room.status} ??? ${actor.role} ???? ${action}`);
  }

  if (typeof targetSeat === "number") {
    const t = room.players.find(p => p.seat === targetSeat);
    if (!t) throw new HttpError(404, `???? ${targetSeat} ???`);
  }

  roleInst.validate(action, targetSeat);
  const { note = "" } = roleInst.apply(action, targetSeat) || {};

  room.log.push({
    phase: room.status,
    actor: actor.role,
    targetSeat: typeof targetSeat === "number" ? targetSeat : null,
    payload: { action, ...payload },
    note
  });
}