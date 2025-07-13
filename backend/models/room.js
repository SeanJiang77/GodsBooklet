import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomName: String,
  playerCount: Number,
  roles: Object,
  rules: Object,
  nightOrder: [String],
  status: { type: String, default: "waiting" },
});

export default mongoose.model("Room", roomSchema);