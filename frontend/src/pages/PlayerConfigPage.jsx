// src/pages/PlayerConfigPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PlayerConfigPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { roomName, playerCount } = state || {};
  const [players, setPlayers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!playerCount) return;
    setPlayers(Array.from({ length: playerCount }, (_, i) => ({ seat: i+1, name: "" })));
  }, [playerCount]);

  if (!roomName || !playerCount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 font-bold">页面参数缺失，请先创建房间</div>
      </div>
    );
  }

  const handleNameChange = (idx, name) => {
    const arr = [...players];
    arr[idx].name = name;
    setPlayers(arr);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    if (players.some(p => !p.name.trim())) {
      setErrorMsg("请为每位玩家输入昵称");
      return;
    }
    navigate("/roles", { state: { roomName, players } });
  };

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold mb-4">房间：{roomName}</h2>
        {errorMsg && <div className="mb-4 text-red-600">{errorMsg}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {players.map((p, i) => (
            <div key={i} className="flex items-center space-x-4">
              <span className="w-8 text-center font-semibold">{p.seat}</span>
              <input
                type="text"
                placeholder={`玩家 ${p.seat} 的昵称`}
                value={p.name}
                onChange={(e) => handleNameChange(i, e.target.value)}
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring"
              />
            </div>
          ))}
          <button
            type="submit"
            className="w-full mt-6 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
          >
            下一步
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlayerConfigPage;
