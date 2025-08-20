import React, { useEffect, useState } from "react";
import { getRoom, step } from "../api/rooms";
import useRoomStore from "../store/roomStore";

function Timer({ enabled }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [enabled]);
  return <span className="text-sm text-gray-500">计时：{sec}s</span>;
}

export default function GMPanel({ onNext }) {
  const { room, setRoom } = useRoomStore();
  const [actorSeat, setActorSeat] = useState(1);
  const [targetSeat, setTargetSeat] = useState(1);
  const [isFirstNight, setIsFirstNight] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!room?._id) return <div className="card">请先创建房间。</div>;

  const refresh = async () => setRoom(await getRoom(room._id));

  const act = async (actor, action) => {
    await step(room._id, {
      actor,                // "seer" | "werewolf" | "witch" | "guard" | "system"
      actorSeat: Number(actorSeat),
      action,               // "check" | "kill" | "heal" | "protect" | "advancePhase" ...
      targetSeat: Number(targetSeat),
      payload: { isFirstNight },  // 角色需要的额外参数
    });
  };

  const guardProtect = () => act("guard", "protect");
  const wolvesKill = () => act("werewolves", "kill");
  const seerCheck = () => act("seer", "check");
  const witchHeal = () => act("witch", "heal");
  const advance = async () => {
    setLoading(true); setError("");
    try {
      const updated = await step(room._id, { actor: "system", action: "advancePhase" });
      setRoom(updated);
      if (updated.status === "day") setIsFirstNight(false);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">主持面板</h2>
        <div className="text-sm text-gray-500">当前阶段：<b>{room.status}</b></div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="label">目标座位</label>
          <input className="input w-32" type="number" min={1} value={targetSeat} onChange={(e) => setTargetSeat(e.target.value)} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFirstNight} onChange={e=>setIsFirstNight(e.target.checked)} /> 首夜
        </label>
        <Timer enabled={true} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button className="btn-primary" onClick={guardProtect} disabled={loading}>守卫守护</button>
        <button className="btn-primary" onClick={wolvesKill} disabled={loading}>狼人击杀</button>
        <button className="btn-primary" onClick={seerCheck} disabled={loading}>预言家查验</button>
        <button className="btn-primary" onClick={witchHeal} disabled={loading}>女巫救人</button>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={advance} disabled={loading}>推进阶段</button>
        <button className="btn-secondary" onClick={refresh}>刷新</button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      <div className="text-sm text-gray-600">
        <p>胜负判定由后端在每步后进行；若结束将自动切换到 <b>end</b> 阶段。</p>
      </div>
    </div>
  );
}
