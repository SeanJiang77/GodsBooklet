import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomName: String,
  playerCount: {
    type: Number,
    required: true,
    validate: {
      validator: function(value) {
        if (!this.roles) return true;
        const totalRoles = Object.values(this.roles).reduce((sum, n) => sum + Number(n), 0);
        return value >= totalRoles;
      },
      message: props => `玩家数量 ${props.value} 少于配置角色总数`
    }
  },
  roles: Object,
  rules: Object,
  nightOrder: [String],
  status: { type: String, default: "waiting" },
});

export default mongoose.model("Room", roomSchema);