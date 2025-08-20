import React, { useState } from "react";
import { addPlayer, getRoom } from "../api/rooms";
import useRoomStore from "../store/roomStore";

export default function PlayerSetup({ onNext }) {
  const { room, setRoom } = useRoomStore();
  const [seat, setSeat] = useState(1);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!room?._id) return <div className="card">请先创建房间。</div>;

  const add = async () => {
    setLoading(true); setError("");
    try {
      const updated = await addPlayer(room._id, { seat: Number(seat), nickname });
      setRoom(updated);
      setNickname("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
    const r = await getRoom(room._id);
    setRoom(r);
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-xl font-semibold">玩家设置</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">座位号</label>
          <input className="input" type="number" min={1} value={seat} onChange={(e) => setSeat(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">昵称</label>
          <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-primary" onClick={add} disabled={loading || !nickname}>{loading ? "添加中…" : "添加玩家"}</button>
        <button className="btn-secondary" onClick={refresh}>刷新</button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(room.players || []).sort((a,b)=>a.seat-b.seat).map(p => (
          <div key={p.seat} className="border rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.nickname}</div>
              <div className="text-sm text-gray-500">座位 {p.seat} · {p.alive ? <span className="badge">存活</span> : <span className="badge">阵亡</span>}</div>
            </div>
            <div className="text-xs text-gray-400">{p.role || "未分配角色"}</div>
          </div>
        ))}
      </div>

      <div>
        <button className="btn-primary" onClick={onNext} disabled={(room.players||[]).length === 0}>下一步：角色分配</button>
      </div>
    </div>
  );
}
