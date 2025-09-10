import React, { useState } from "react";
import { createRoom } from "../api/rooms";
import useRoomStore from "../store/roomStore";

export default function CreateRoom() {
  const { setRoom } = useRoomStore();
  const [name, setName] = useState("今晚狼人杀");
  const [maxSeats, setMaxSeats] = useState(12);
  const [presetKey, setPresetKey] = useState("12p-classic");
  const [mode, setMode] = useState("flex");
  const [initialPlayers, setInitialPlayers] = useState(9); // ✅ 新增

  const onSubmit = async (e) => {
    e.preventDefault();
    const room = await createRoom({
      name,
      maxSeats: Number(maxSeats),
      presetKey,
      mode,
      initialPlayers: Number(initialPlayers), // ✅ 关键
    });
    setRoom(room);
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">房间名</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label className="label">最大座位</label>
          <input className="input" type="number" min={4} value={maxSeats}
                 onChange={e=>setMaxSeats(e.target.value)} />
        </div>
        <div>
          <label className="label">预设</label>
          <select className="input" value={presetKey} onChange={e=>setPresetKey(e.target.value)}>
            <option value="12p-classic">12人经典</option>
            <option value="9p-classic">9人经典</option>
          </select>
        </div>
        <div>
          <label className="label">模式</label>
          <select className="input" value={mode} onChange={e=>setMode(e.target.value)}>
            <option value="flex">灵活</option>
            <option value="strict">严格</option>
          </select>
        </div>

        {/* ✅ 新增：开局就生成 N 个“空白玩家（1..N，昵称为空）” */}
        <div>
          <label className="label">房间人数（直接生成空白玩家）</label>
          <input className="input" type="number" min={0} max={maxSeats}
                 value={initialPlayers}
                 onChange={e=>setInitialPlayers(e.target.value)} />
        </div>
      </div>

      <button className="btn-primary" type="submit">创建房间</button>
    </form>
  );
}
