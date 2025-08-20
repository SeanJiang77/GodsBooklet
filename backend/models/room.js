import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    seat: { type: Number, required: true, min: 1 },
    nickname: { type: String, required: true, trim: true },
    role: { type: String, default: null },
    alive: { type: Boolean, default: true },
  },
  { _id: false }
);

const RulesSchema = new mongoose.Schema(
  {
    witchSelfSaveFirstNight: { type: Boolean, default: true },
    guardConsecutiveProtectAllowed: { type: Boolean, default: false },
    sheriffEnabled: { type: Boolean, default: false },
    language: { type: String, enum: ["zh", "en"], default: "zh" },
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    phase: { type: String, enum: ["init", "night", "day", "vote", "end"], required: true },
    actor: { type: String, default: null },
    targetSeat: { type: Number, default: null },
    payload: { type: Object, default: {} },
    note: { type: String, default: "" },
    undoOf: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { _id: true }
);

const RoomSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["init", "night", "day", "vote", "end"], default: "init" },
    players: { type: [PlayerSchema], default: [] },
    rules: { type: RulesSchema, default: {} },
    log: { type: [EventSchema], default: [] },
    maxSeats: { type: Number, required: true, min: 4 },

    presetKey: { type: String, default: null },
    rolesConfig: { type: Object, default: {} },

    meta: {
      expectedPlayers: { type: Number, default: 0 },
      playersNeeded: { type: Number, default: 0 },
      phaseAllowedActors: { type: [String], default: [] },
      mode: { type: String, default: "flex" },
      ready: { type: Boolean, default: false },
      readyIssues: { type: [String], default: [] },
      minPlayers: { type: Number, default: 4 },
      currentPlayers: { type: Number, default: 0 },
    },

    lobbyLocked: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model("Room", RoomSchema);
