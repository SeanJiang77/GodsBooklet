import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function CreateRoomPage() {
  const [roomName, setRoomName] = useState("");
  const [playerCount, setPlayerCount] = useState(12);
  const navigate = useNavigate();

  const defaultRoles = {
    狼人: 3,
    狼王: 1,
    预言家: 1,
    女巫: 1,
    猎人: 1,
    守卫: 1,
    村民: 4,
  };

  const defaultRules = {
    hasSheriff: true,
    sheriffBonus: true,
    witchDoubleNightUse: false,
    witchSelfSaveFirstNight: true,
    guardRepeat: false,
    hunterRevenge: true,
    idiotSpeakVote: false,
    loverEnabled: false,
  };

  const nightOrder = ["守卫", "狼人", "预言家", "女巫"];

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:3001/api/rooms", {
        roomName,
        playerCount,
        roles: defaultRoles,
        rules: defaultRules,
        nightOrder,
      });

      const roomId = res.data._id;
      // 你可以存 roomId 然后跳转
      navigate("/players", { state: { roomId, roomName, playerCount } });
    } catch (err) {
      alert("房间创建失败：" + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-8">
        <h2 className="text-2xl font-bold mb-6">创建房间</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-semibold">房间名称</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold">玩家人数</label>
            <input
              type="number"
              min="6"
              max="18"
              className="w-full border rounded px-3 py-2"
              value={playerCount}
              onChange={(e) => setPlayerCount(Number(e.target.value))}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            使用基础配置，创建房间
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateRoomPage;