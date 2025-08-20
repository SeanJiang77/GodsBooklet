import React, { useState } from "react";
import { createRoom } from "../api/rooms";
import useRoomStore from "../store/roomStore";

const PRESETS = [
  { key: "9p-classic", label: "9人经典" },
  { key: "12p-classic", label: "12人经典" },
];

export default function RoomCreate({ onNext }) {
  const { setRoom } = useRoomStore();
  const [name, setName] = useState("Club Night");
  const [maxSeats, setMaxSeats] = useState(9);
  const [presetKey, setPresetKey] = useState("9p-classic");
  const [witchSelfSaveFirstNight, setWitchFirst] = useState(false);
  const [guardConsecutive, setGuardConsecutive] = useState(false);
  const [sheriffEnabled, setSheriff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const payload = {
        name,
        maxSeats: Number(maxSeats),
        presetKey,
        rules: {
          witchSelfSaveFirstNight: Boolean(witchSelfSaveFirstNight),
          guardConsecutiveProtectAllowed: Boolean(guardConsecutive),
          sheriffEnabled: Boolean(sheriffEnabled),
        },
      };
      const room = await createRoom(payload);
      setRoom(room);
      onNext?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <h2 className="text-xl font-semibold">创建房间</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">房间名称</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">最大座位</label>
          <input className="input" type="number" min={4} value={maxSeats} onChange={(e) => setMaxSeats(e.target.value)} />
        </div>
        <div>
          <label className="label">预设模板</label>
          <select className="input" value={presetKey} onChange={(e) => setPresetKey(e.target.value)}>
            {PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-6 flex-wrap">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={witchSelfSaveFirstNight} onChange={e => setWitchFirst(e.target.checked)} /> 女巫首夜自救
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={guardConsecutive} onChange={e => setGuardConsecutive(e.target.checked)} /> 守卫连守
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={sheriffEnabled} onChange={e => setSheriff(e.target.checked)} /> 开启警长流程
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-primary" onClick={submit} disabled={loading}>{loading ? "创建中…" : "创建房间"}</button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  );
}
