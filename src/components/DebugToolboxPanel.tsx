import { useMemo, useState } from 'react';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids.ts';
import { useSendInput } from '../hooks/sendInput.ts';
import { RoleLocatorEntry } from './ApiConnectionPanel.tsx';

type ActionState = {
  status: 'idle' | 'working' | 'ok' | 'error';
  message: string;
};

function statusClass(status: ActionState['status']) {
  switch (status) {
    case 'ok':
      return 'bg-green-700 text-green-50';
    case 'error':
      return 'bg-rose-700 text-rose-50';
    case 'working':
      return 'bg-amber-700 text-amber-50';
    default:
      return 'bg-brown-600 text-brown-50';
  }
}

export function DebugToolboxPanel({
  engineId,
  selectedPlayerId,
  roleLocatorEntries,
  conversationByPlayerId,
}: {
  engineId: Id<'engines'>;
  selectedPlayerId?: GameId<'players'>;
  roleLocatorEntries: RoleLocatorEntry[];
  conversationByPlayerId: Record<string, string | undefined>;
}) {
  const [targetPlayerId, setTargetPlayerId] = useState<GameId<'players'> | undefined>();
  const [actionState, setActionState] = useState<ActionState>({
    status: 'idle',
    message: '请选择动作。',
  });

  const startConversation = useSendInput(engineId, 'startConversation');
  const leaveConversation = useSendInput(engineId, 'leaveConversation');

  const selectedPlayer = useMemo(
    () => roleLocatorEntries.find((entry) => entry.playerId === selectedPlayerId),
    [roleLocatorEntries, selectedPlayerId],
  );

  const candidateTargets = useMemo(
    () => roleLocatorEntries.filter((entry) => entry.playerId !== selectedPlayerId),
    [roleLocatorEntries, selectedPlayerId],
  );

  async function startSocialNow() {
    if (!selectedPlayerId) {
      setActionState({ status: 'error', message: '请先在右侧信息窗格选定角色。' });
      return;
    }
    const existingConversationId = conversationByPlayerId[selectedPlayerId];
    if (existingConversationId) {
      setActionState({ status: 'error', message: '该角色当前已经在社交中。' });
      return;
    }
    const source = roleLocatorEntries.find((entry) => entry.playerId === selectedPlayerId);
    if (!source) {
      setActionState({ status: 'error', message: '未找到选中角色。' });
      return;
    }

    const nearest = candidateTargets
      .map((entry) => {
        const dx = entry.position.x - source.position.x;
        const dy = entry.position.y - source.position.y;
        return { entry, dist: Math.sqrt(dx * dx + dy * dy) };
      })
      .sort((a, b) => a.dist - b.dist)[0]?.entry;

    if (!nearest) {
      setActionState({ status: 'error', message: '没有可用于社交的目标角色。' });
      return;
    }

    setActionState({ status: 'working', message: '正在触发社交...' });
    try {
      await startConversation({ playerId: selectedPlayerId, invitee: nearest.playerId });
      setActionState({
        status: 'ok',
        message: `已触发 ${source.name} 与 ${nearest.name} 开始社交。`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setActionState({ status: 'error', message: `触发失败：${message}` });
    }
  }

  async function stopSocialNow() {
    if (!selectedPlayerId) {
      setActionState({ status: 'error', message: '请先在右侧信息窗格选定角色。' });
      return;
    }
    const conversationId = conversationByPlayerId[selectedPlayerId];
    if (!conversationId) {
      setActionState({ status: 'error', message: '该角色当前不在社交中。' });
      return;
    }

    setActionState({ status: 'working', message: '正在中断社交...' });
    try {
      await leaveConversation({
        playerId: selectedPlayerId,
        conversationId: conversationId as GameId<'conversations'>,
      });
      setActionState({ status: 'ok', message: '已触发角色中断当前社交。' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setActionState({ status: 'error', message: `中断失败：${message}` });
    }
  }

  async function startSocialWithTarget() {
    if (!selectedPlayerId) {
      setActionState({ status: 'error', message: '请先在右侧信息窗格选定角色。' });
      return;
    }
    if (!targetPlayerId) {
      setActionState({ status: 'error', message: '请先指定目标角色。' });
      return;
    }

    setActionState({ status: 'working', message: '正在触发定向社交...' });
    try {
      await startConversation({ playerId: selectedPlayerId, invitee: targetPlayerId });
      const target = roleLocatorEntries.find((entry) => entry.playerId === targetPlayerId);
      setActionState({
        status: 'ok',
        message: `已触发与 ${target?.name ?? targetPlayerId} 的定向社交。`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      setActionState({ status: 'error', message: `触发失败：${message}` });
    }
  }

  return (
    <div className="mt-6">
      <div className="box">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          调试工具箱
        </h2>
      </div>
      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          <p>当前选定角色：{selectedPlayer ? `${selectedPlayer.name} (${selectedPlayer.playerId})` : '未选择'}</p>

          <button className="rounded bg-clay-700 px-3 py-1" onClick={startSocialNow}>
            让选定角色立刻开始社交
          </button>

          <button className="rounded bg-clay-700 px-3 py-1" onClick={stopSocialNow}>
            让选定角色立刻中断社交
          </button>

          <label className="block">
            <span>指定社交目标</span>
            <select
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={targetPlayerId ?? ''}
              onChange={(event) =>
                setTargetPlayerId((event.target.value || undefined) as GameId<'players'> | undefined)
              }
            >
              <option value="">请选择目标角色</option>
              {candidateTargets.map((entry) => (
                <option key={entry.playerId} value={entry.playerId}>
                  {entry.name} ({entry.playerId})
                </option>
              ))}
            </select>
          </label>

          <button className="rounded bg-clay-700 px-3 py-1" onClick={startSocialWithTarget}>
            让选定角色与指定角色立刻开始社交
          </button>

          <div className="flex items-center justify-between gap-3">
            <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusClass(actionState.status)}`}>
              {actionState.status.toUpperCase()}
            </span>
            <span className="text-brown-200">社交调试</span>
          </div>
          <p>{actionState.message}</p>
        </div>
      </div>
    </div>
  );
}
