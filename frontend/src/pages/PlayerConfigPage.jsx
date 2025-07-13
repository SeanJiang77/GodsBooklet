import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function PlayerConfigPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomName, playerCount } = location.state || {};

  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!playerCount) return;
    // 初始化玩家列表
    setPlayers(
      Array.from({ length: playerCount }, (_, i) => ({
        seat: i + 1,
        name: "",
      }))
    );
  }, [playerCount]);

  const handleNameChange = (index, newName) => {
    const updated = [...players];
    updated[index].name = newName;
    setPlayers(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const hasEmpty = players.some((p) => !p.name.trim());
    if (hasEmpty) {
      alert("请为每位玩家输入昵称");
      return;
    }

    // 存储数据并跳转（这里暂时打印）
    console.log("玩家信息：", players);
    navigate("/roles", { state: { roomName, players } });
  };

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-4">房间：{roomName}</h2>
        <p className="text-gray-700 mb-6">请输入每位玩家的昵称：</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {players.map((player, index) => (
            <div key={index} className="flex items-center space-x-4">
              <span className="w-10 font-semibold text-center">
                {player.seat}
              </span>
              <input
                type="text"
                placeholder={`玩家 ${player.seat} 的昵称`}
                value={player.name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring"
              />
            </div>
          ))}

          <button
            type="submit"
            className="w-full mt-6 bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700 transition"
          >
            下一步
          </button>
        </form>
      </div>
    </div>
  );
}

export default PlayerConfigPage;
