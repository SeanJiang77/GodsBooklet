import React, { useEffect, useState } from "react";
import { getRoom, step, fastNight } from "../api/rooms";
import useRoomStore from "../store/roomStore";

function Timer({ enabled }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [enabled]);
  return <span className="text-sm text-gray-500">计时:{sec}s</span>;
}

export default function GMPanel({ onNext }) {
  const { room, setRoom } = useRoomStore();
  const [actorSeat, setActorSeat] = useState(1);
  const [targetSeat, setTargetSeat] = useState(1);
  const [isFirstNight, setIsFirstNight] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  // 快进输入
  const [ffGuard, setFfGuard] = useState("");
  const [ffWolves, setFfWolves] = useState("");
  const [ffSeer, setFfSeer] = useState("");
  const [ffHeal, setFfHeal] = useState("");
  const [ffPoison, setFfPoison] = useState("");

  if (!room?._id) return <div className="card">请先创建房间</div>;

  const refresh = async () => setRoom(await getRoom(room._id));

  const act = async (actor, action) => {
    await step(room._id, {
      actor,
      actorSeat: Number(actorSeat),
      action,
      targetSeat: Number(targetSeat),
      payload: { isFirstNight },
    });
  };

  const guardProtect = () => act("guard", "protect");
  const wolvesKill = () => act("werewolves", "kill");
  const seerCheck = () => act("seer", "check");
  const witchHeal = () => act("witch", "heal");
  const advance = async () => {
    setLoading(true);
    setError("");
    try {
      const updated = await step(room._id, { actor: "system", action: "advancePhase" });
      setRoom(updated);
      if (updated.status === "day") setIsFirstNight(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runFastNight = async () => {
    setLoading(true);
    setError("");
    setSummary(null);
    try {
      const payload = {
        guard: { targetSeat: ffGuard ? Number(ffGuard) : null },
        wolves: { targetSeat: ffWolves ? Number(ffWolves) : null },
        seer: { targetSeat: ffSeer ? Number(ffSeer) : null },
        witch: { healTargetSeat: ffHeal ? Number(ffHeal) : null, poisonTargetSeat: ffPoison ? Number(ffPoison) : null, isFirstNight },
        advanceToDay: false,
      };
      const { room: updated, summary } = await fastNight(room._id, payload);
      setRoom(updated);
      setSummary(summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">主持面板</h2>
        <div className="text-sm text-gray-500">当前阶段:<b>{room.status}</b></div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="label">目标座位</label>
          <input
            className="input w-32"
            type="number"
            min={1}
            value={targetSeat}
            onChange={(e) => setTargetSeat(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isFirstNight} onChange={(e) => setIsFirstNight(e.target.checked)} /> 首夜
        </label>
        <Timer enabled={true} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button className="btn-primary" onClick={guardProtect} disabled={loading}>
          守卫守护
        </button>
        <button className="btn-primary" onClick={wolvesKill} disabled={loading}>
          狼人袭击
        </button>
        <button className="btn-primary" onClick={seerCheck} disabled={loading}>
          预言家查验
        </button>
        <button className="btn-primary" onClick={witchHeal} disabled={loading}>
          女巫救/毒
        </button>
      </div>

      <div className="card space-y-3 border border-gray-200">
        <h3 className="text-lg font-medium">夜晚快进</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="label">守卫守护</label>
            <input className="input" type="number" min={1} value={ffGuard} onChange={(e)=>setFfGuard(e.target.value)} placeholder="座位号或留空" />
          </div>
          <div>
            <label className="label">狼人击杀</label>
            <input className="input" type="number" min={1} value={ffWolves} onChange={(e)=>setFfWolves(e.target.value)} placeholder="座位号或留空" />
          </div>
          <div>
            <label className="label">预言家验人</label>
            <input className="input" type="number" min={1} value={ffSeer} onChange={(e)=>setFfSeer(e.target.value)} placeholder="座位号或留空" />
          </div>
          <div>
            <label className="label">女巫救人</label>
            <input className="input" type="number" min={1} value={ffHeal} onChange={(e)=>setFfHeal(e.target.value)} placeholder="座位号或留空" />
          </div>
          <div>
            <label className="label">女巫毒人</label>
            <input className="input" type="number" min={1} value={ffPoison} onChange={(e)=>setFfPoison(e.target.value)} placeholder="座位号或留空" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={runFastNight} disabled={loading}>执行快进</button>
          </div>
        </div>
        {summary && (
          <div className="text-sm text-gray-700">
            <div>本夜动作：
              {summary.attempted.guardProtect!=null && ` 守护${summary.attempted.guardProtect}`}
              {summary.attempted.wolvesKill!=null && ` 狼刀${summary.attempted.wolvesKill}`}
              {summary.attempted.seerCheck!=null && ` 验人${summary.attempted.seerCheck}`}
              {summary.attempted.witchHeal!=null && ` 救${summary.attempted.witchHeal}`}
              {summary.attempted.witchPoison!=null && ` 毒${summary.attempted.witchPoison}`}
            </div>
            <div>拦截：{summary.prevented.byGuard?"守卫拦下":"-"} / {summary.prevented.byHeal?"女巫救起":"-"}</div>
            {summary.extra && summary.extra.sameProtectAndHeal && (
              <div className="text-amber-700">同守同救：{summary.extra.sameProtectAndHeal}（被刀仍死亡）</div>
            )}
            <div>死亡：{summary.killed.length? summary.killed.join(', ') : '无'}</div>
            <div>存活：{summary.survived.length? summary.survived.join(', ') : '无'}</div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={advance} disabled={loading}>
          推进阶段
        </button>
        <button className="btn-secondary" onClick={refresh}>刷新</button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      <div className="text-sm text-gray-600">
        <p>
          游戏将持续推进直至胜负判定，状态会最终进入<b>end</b>。
        </p>
      </div>
    </div>
  );
}
