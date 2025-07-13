import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  name: String,
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  status: {
    type: String,
    enum: ["waiting", "in-game", "ended"],
    default: "waiting",
  },
});

export default mongoose.model("Room", roomSchema);
