// src/pages/CreateRoomPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ROLE_KEYS = ["狼人", "狼王", "预言家", "女巫", "猎人", "守卫", "村民"];

const CreateRoomPage = () => {
  const [mode, setMode] = useState("classic"); // "classic" or "custom"
  const [roomName, setRoomName] = useState("");
  const [playerCount, setPlayerCount] = useState(12);
  const [customRoles, setCustomRoles] = useState({
    狼人: 3,
    狼王: 1,
    预言家: 1,
    女巫: 1,
    猎人: 1,
    守卫: 1,
    村民: 4,
  });
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const defaultRoles = { ...customRoles };
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

  const handleCustomRoleChange = (role, value) => {
    setCustomRoles((prev) => ({
      ...prev,
      [role]: Number(value < 0 ? 0 : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!roomName.trim()) {
      setErrorMsg("请输入房间名称");
      return;
    }

    // 计算所选配置下的总身份数
    const roles = mode === "classic" ? defaultRoles : customRoles;
    const totalRoles = Object.values(roles).reduce((a, b) => a + b, 0);
    if (playerCount < totalRoles) {
      setErrorMsg(`玩家数量不足，至少需要 ${totalRoles} 人`);
      return;
    }

    try {
      const { data } = await axios.post("http://localhost:3001/api/rooms", {
        roomName,
        playerCount,
        roles,
        rules: defaultRules,
        nightOrder,
      });
      if (!data.success) {
        setErrorMsg(data.error || "房间创建失败");
        return;
      }
      navigate("/players", {
        state: {
          roomId: data.data._id,
          roomName: data.data.roomName,
          playerCount: data.data.playerCount,
        },
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-xl px-8 py-6 w-full max-w-lg"
      >
        <h2 className="text-2xl font-bold text-center mb-6">
          创建狼人杀房间
        </h2>

        {errorMsg && (
          <div className="mb-4 text-red-600 text-center">{errorMsg}</div>
        )}

        {/* 房间名与人数 */}
        <div className="mb-4">
          <label className="block mb-1 font-medium">房间名称</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="例如：周五晚局"
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-1 font-medium">玩家人数</label>
          <input
            type="number"
            min="6"
            max="18"
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            required
          />
        </div>

        {/* 模式选择 */}
        <div className="mb-6 flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              className="mr-2"
              checked={mode === "classic"}
              onChange={() => setMode("classic")}
            />
            经典配置
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              className="mr-2"
              checked={mode === "custom"}
              onChange={() => setMode("custom")}
            />
            自定义配置
          </label>
        </div>

        {/* 自定义配置区域 */}
        {mode === "custom" && (
          <div className="mb-6 bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">自定义身份数量</h3>
            <div className="grid grid-cols-2 gap-4">
              {ROLE_KEYS.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <label className="w-20">{role}</label>
                  <input
                    type="number"
                    min="0"
                    value={customRoles[role]}
                    onChange={(e) =>
                      handleCustomRoleChange(role, e.target.value)
                    }
                    className="w-16 border rounded px-2 py-1 focus:outline-none focus:ring"
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              总身份数：{" "}
              {Object.values(customRoles).reduce((a, b) => a + b, 0)}
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
        >
          {mode === "classic" ? "使用经典配置创建房间" : "创建自定义配置房间"}
        </button>
      </form>
    </div>
  );
};

export default CreateRoomPage;
