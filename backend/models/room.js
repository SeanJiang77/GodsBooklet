import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomName: String,
  playerCount: Number,
  roles: Object,
  rules: Object,
  nightOrder: [String],
  status: {
    type: String,
    enum: ["waiting", "in-game", "ended"],
    default: "waiting",
  },
});

export default mongoose.model("Room", roomSchema);