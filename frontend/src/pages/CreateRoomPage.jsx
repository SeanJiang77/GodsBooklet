import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function CreateRoomPage() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [playerCount, setPlayerCount] = useState(12);

  const [roles, setRoles] = useState({
    狼人: 3,
    狼王: 1,
    预言家: 1,
    女巫: 1,
    猎人: 1,
    守卫: 1,
    村民: 4,
  });

  const [rules, setRules] = useState({
    hasSheriff: true,
    sheriffBonus: true,
    witchDoubleNightUse: false,
    witchSelfSaveFirstNight: true,
    guardRepeat: false,
    hunterRevenge: true,
    idiotSpeakVote: false,
    loverEnabled: false,
  });

  const handleRoleChange = (role, value) => {
    setRoles({ ...roles, [role]: parseInt(value) });
  };

  const handleRuleToggle = (rule) => {
    setRules({ ...rules, [rule]: !rules[rule] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:3001/api/rooms", {
        roomName,
        playerCount,
        roles,
        rules,
        nightOrder: ["守卫", "狼人", "预言家", "女巫"],
        status: "waiting",
      });
      console.log("创建成功：", res.data);
      navigate("/players", { state: { roomName, playerCount } });
    } catch (err) {
      alert("房间创建失败：" + err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-8 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-4">创建房间</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border px-4 py-2"
          placeholder="房间名"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          required
        />

        <input
          className="w-full border px-4 py-2"
          type="number"
          placeholder="玩家人数"
          value={playerCount}
          onChange={(e) => setPlayerCount(parseInt(e.target.value))}
          required
        />

        <h2 className="font-semibold mt-6">角色数量：</h2>
        {Object.entries(roles).map(([role, count]) => (
          <div key={role} className="flex justify-between items-center">
            <label>{role}</label>
            <input
              type="number"
              className="border px-2 py-1 w-20"
              value={count}
              onChange={(e) => handleRoleChange(role, e.target.value)}
              min={0}
            />
          </div>
        ))}

        <h2 className="font-semibold mt-6">游戏规则：</h2>
        {Object.entries(rules).map(([rule, value]) => (
          <div key={rule} className="flex justify-between items-center">
            <label>{rule}</label>
            <input
              type="checkbox"
              checked={value}
              onChange={() => handleRuleToggle(rule)}
            />
          </div>
        ))}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          创建房间
        </button>
      </form>
    </div>
  );
}

export default CreateRoomPage;