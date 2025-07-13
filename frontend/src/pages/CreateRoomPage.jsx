import { useState } from "react";
import { useNavigate } from "react-router-dom";

function CreateRoomPage() {
  const [roomName, setRoomName] = useState("");
  const [playerCount, setPlayerCount] = useState(8);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!roomName || playerCount < 5 || playerCount > 20) {
      alert("请输入有效的房间名和 5~20 位玩家人数");
      return;
    }

    // 可以用 navigate 传数据到下一页，比如加 query param 或状态管理
    navigate("/players", {
      state: { roomName, playerCount },
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-yellow-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-xl px-8 pt-6 pb-8 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          创建游戏房间
        </h2>

        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">
            房间名
          </label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            placeholder="例如：周五晚局"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            玩家人数
          </label>
          <input
            type="number"
            min="5"
            max="20"
            value={playerCount}
            onChange={(e) => setPlayerCount(parseInt(e.target.value))}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            placeholder="例如：12"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 font-bold transition"
        >
          下一步
        </button>
      </form>
    </div>
  );
}

export default CreateRoomPage;
