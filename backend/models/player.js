import mongoose from "mongoose";

const playerSchema = new mongoose.Schema({
  name: String,
  seat: Number,
  role: String,
  isAlive: { type: Boolean, default: true },
});

export default mongoose.model("Player", playerSchema);
