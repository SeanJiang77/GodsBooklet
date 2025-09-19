import React, { useState } from "react";
import RoomCreate from "./pages/RoomCreate.jsx";
import PlayerSetup from "./pages/PlayerSetup.jsx";
import RoleAssign from "./pages/RoleAssign.jsx";
import GMPanel from "./pages/GMPanel.jsx";
import LogPanel from "./pages/LogPanel.jsx";
import useRoomStore from "./store/roomStore.js";

export default function App() {
  const [tab, setTab] = useState("create");
  const { room } = useRoomStore();

  const tabs = [
    { key: "create", label: "创建房间" },
    { key: "players", label: "玩家设置", disabled: !room?._id },
    { key: "assign", label: "发牌", disabled: !room?._id },
    { key: "gm", label: "主持面板", disabled: !room?._id },
    { key: "log", label: "日志 / 撤销", disabled: !room?._id },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">GodsBooklet 主持工具</h1>
        <div className="text-sm text-gray-500">{room?._id ? `房间ID：${room._id}` : "请先创建房间"}</div>
      </header>

      <nav className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? "btn-primary" : "btn-secondary"} ${t.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => !t.disabled && setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "create" && <RoomCreate onNext={() => setTab("players")} />}
      {tab === "players" && <PlayerSetup onNext={() => setTab("assign")} />}
      {tab === "assign" && <RoleAssign onNext={() => setTab("gm")} />}
      {tab === "gm" && <GMPanel onNext={() => setTab("log")} />}
      {tab === "log" && <LogPanel />}
    </div>
  );
}