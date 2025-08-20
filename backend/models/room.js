// models/room.js
// Schema for Room, Player, Rules, Event. ES Modules + Mongoose.
import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    seat: { type: Number, required: true, min: 1 },
    nickname: { type: String, required: true, trim: true },
    role: { type: String, default: null }, // e.g., 'werewolf', 'seer', 'witch', 'guard', 'villager'
    alive: { type: Boolean, default: true },
  },
  { _id: false }
);

const RulesSchema = new mongoose.Schema(
  {
    witchSelfSaveFirstNight: { type: Boolean, default: true }, // 女巫首夜自救
    guardConsecutiveProtectAllowed: { type: Boolean, default: false }, // 守卫连守
    sheriffEnabled: { type: Boolean, default: false }, // 警长流程可选
    language: { type: String, enum: ["zh", "en"], default: "zh" }, // 多语言 UI
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    phase: { type: String, enum: ["night", "day", "vote", "end"], required: true },
    actor: { type: String, default: null }, // e.g., 'guard', 'werewolves', 'seer', 'witch', 'system'
    targetSeat: { type: Number, default: null },
    payload: { type: Object, default: {} },
    note: { type: String, default: "" },
    undoOf: { type: mongoose.Schema.Types.ObjectId, default: null }, // event this undoes
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
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.model("Room", RoomSchema);
