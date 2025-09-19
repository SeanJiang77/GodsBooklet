import React, { useState } from "react";
import { assignRoles } from "../api/rooms";
import useRoomStore from "../store/roomStore";

export default function RoleAssign({ onNext }) {
  const { room, setRoom } = useRoomStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!room?._id) return <div className="card">请先创建房间</div>;

  const run = async () => {
    setLoading(true); setError("");
    try {
      const updated = await assignRoles(room._id, {});
      setRoom(updated);
      onNext?.();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-xl font-semibold">发牌</h2>
      <p className="text-sm text-gray-600">将根据预设/自定义配置分配角色。<b>发牌后开始夜晚</b>。</p>

      <div className="flex items-center gap-2">
        <button className="btn-primary" onClick={run} disabled={loading || (room.players||[]).length===0}>{loading?"发牌中...":"开始发牌"}</button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(room.players||[]).sort((a,b)=>a.seat-b.seat).map(p => (
          <li key={p.seat} className="border rounded-xl p-3">
            <div className="font-medium">座位 {p.seat} · {p.nickname}</div>
            <div className="text-sm text-gray-500">角色：{p.role || "未分配"}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}