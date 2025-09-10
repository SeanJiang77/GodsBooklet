// backend/models/room.js
import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema(
  {
    /** Display name shown in the lobby / table */
    nickname: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 40,
    },
    /** Optional seat index, 1-based */
    seat: { type: Number, min: 1 },
    /** Final assigned role after dealing */
    role: { type: String, default: null },
    /** If you later link to a user account */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema(
  {
    /** e.g., "classic" | "custom" */
    configType: { type: String, enum: ["classic", "custom"], required: true },
    /** number of chairs at the table */
    playerCount: { type: Number, required: true, min: 1, max: 20 },
    /** roles object, e.g. { villager: 4, werewolf: 2, seer: 1 } */
    roles: {
      type: Map,
      of: Number,
      default: {},
      validate: {
        validator(v) {
          // all non-negative integers
          return Array.from(v.values()).every((n) => Number.isInteger(n) && n >= 0);
        },
        message: "All role counts must be non-negative integers.",
      },
    },
    /** player array always length === playerCount */
    players: {
      type: [PlayerSchema],
      validate: {
        validator(arr) {
          return Array.isArray(arr);
        },
        message: "Players must be an array.",
      },
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Room", RoomSchema);
