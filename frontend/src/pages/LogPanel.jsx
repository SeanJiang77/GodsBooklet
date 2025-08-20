import React, { useState } from "react";
import { undo, getRoom } from "../api/rooms";
import useRoomStore from "../store/roomStore";

export default function LogPanel() {
  const { room, setRoom } = useRoomStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [eventId, setEventId] = useState("");

  if (!room?._id) return <div className="card">请先创建房间。</div>;

  const refresh = async () => setRoom(await getRoom(room._id));

  const doUndo = async () => {
    if (!eventId) return;
    setLoading(true); setError("");
    try {
      const updated = await undo(room._id, { eventId });
      setRoom(updated);
      setEventId("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const events = (room.log || []).slice().reverse();

  return (
    <div className="card space-y-4">
      <h2 className="text-xl font-semibold">日志 / 撤销</h2>

      <div className="flex items-center gap-2">
        <input className="input" placeholder="事件ID" value={eventId} onChange={e=>setEventId(e.target.value)} />
        <button className="btn-secondary" onClick={doUndo} disabled={loading || !eventId}>撤销所选事件</button>
        <button className="btn-secondary" onClick={refresh}>刷新</button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      <ul className="space-y-2 max-h-[420px] overflow-auto">
        {events.map(ev => (
          <li key={ev._id} className="border rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm">[{new Date(ev.at).toLocaleTimeString()}] <b>{ev.phase}</b> · {ev.actor || "system"}</div>
              <code className="text-xs text-gray-500">{ev._id}</code>
            </div>
            {ev.targetSeat != null && (
              <div className="text-sm text-gray-600">目标座位：{ev.targetSeat}</div>
            )}
            {ev.note && <div className="text-sm text-gray-600">备注：{ev.note}</div>}
          </li>
        ))}
      </ul>

      {room.status === "end" && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
          本局已结束。可在此处扩展导出 JSON/PNG。
        </div>
      )}
    </div>
  );
}
