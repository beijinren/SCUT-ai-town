import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids.ts';
import { THOUGHT_LEVELS, type ThoughtLevel } from '../../convex/agent/thoughtConfig';
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
  worldId,
  selectedPlayerId,
  roleLocatorEntries,
  conversationByPlayerId,
}: {
  engineId: Id<'engines'>;
  worldId: Id<'worlds'>;
  selectedPlayerId?: GameId<'players'>;
  roleLocatorEntries: RoleLocatorEntry[];
  conversationByPlayerId: Record<string, string | undefined>;
}) {
  const [targetPlayerId, setTargetPlayerId] = useState<GameId<'players'> | undefined>();
  const [actionState, setActionState] = useState<ActionState>({
    status: 'idle',
    message: 'Select an action.',
  });

  const startConversation = useSendInput(engineId, 'startConversation');
  const leaveConversation = useSendInput(engineId, 'leaveConversation');
  const agentId = useQuery(
    api.agent.thoughtState.getAgentIdByPlayerId,
    selectedPlayerId ? { worldId, playerId: selectedPlayerId } : 'skip',
  );
  const thoughtLevel = useQuery(
    api.agent.thoughtState.getAgentThoughtLevel,
    selectedPlayerId && agentId ? { agentId, playerId: selectedPlayerId } : 'skip',
  ) ?? THOUGHT_LEVELS.INTUITION;
  const saveThoughtLevel = useMutation(api.agent.thoughtState.setAgentThoughtLevel);

  const selectedPlayer = useMemo(
    () => roleLocatorEntries.find((entry) => entry.playerId === selectedPlayerId),
    [roleLocatorEntries, selectedPlayerId],
  );

  const candidateTargets = useMemo(
    () => roleLocatorEntries.filter((entry) => entry.playerId !== selectedPlayerId),
    [roleLocatorEntries, selectedPlayerId],
  );

  async function updateThoughtLevel(nextLevel: ThoughtLevel) {
    if (!selectedPlayerId || !agentId) {
      setActionState({ status: 'error', message: 'Select a player and wait for the thought state to load.' });
      return;
    }
    setActionState({ status: 'working', message: 'Saving thought level...' });
    try {
      await saveThoughtLevel({ agentId, playerId: selectedPlayerId, thoughtLevel: nextLevel });
      setActionState({
        status: 'ok',
        message: `Set ${selectedPlayer?.name ?? 'the selected player'} to ${nextLevel}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setActionState({ status: 'error', message: `Failed to save thought level: ${message}` });
    }
  }

  async function startSocialNow() {
    if (!selectedPlayerId) {
      setActionState({ status: 'error', message: 'Select a player first.' });
      return;
    }
    const existingConversationId = conversationByPlayerId[selectedPlayerId];
    if (existingConversationId) {
      setActionState({ status: 'error', message: 'That player is already in a conversation.' });
      return;
    }
    const source = roleLocatorEntries.find((entry) => entry.playerId === selectedPlayerId);
    if (!source) {
      setActionState({ status: 'error', message: 'Selected player not found.' });
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
      setActionState({ status: 'error', message: 'No valid target to start a conversation.' });
      return;
    }

    setActionState({ status: 'working', message: 'Triggering conversation...' });
    try {
      await startConversation({ playerId: selectedPlayerId, invitee: nearest.playerId });
      setActionState({
        status: 'ok',
        message: `Triggered ${source.name} to start a conversation with ${nearest.name}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setActionState({ status: 'error', message: `Trigger failed: ${message}` });
    }
  }

  async function stopSocialNow() {
    if (!selectedPlayerId) {
      setActionState({ status: 'error', message: 'Select a player first.' });
      return;
    }
    const conversationId = conversationByPlayerId[selectedPlayerId];
    if (!conversationId) {
      setActionState({ status: 'error', message: 'That player is not in a conversation.' });
      return;
    }

    setActionState({ status: 'working', message: 'Stopping conversation...' });
    try {
      await leaveConversation({
        playerId: selectedPlayerId,
        conversationId: conversationId as GameId<'conversations'>,
      });
      setActionState({ status: 'ok', message: 'Stopped the current conversation.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setActionState({ status: 'error', message: `Stop failed: ${message}` });
    }
  }

  async function startSocialWithTarget() {
    if (!selectedPlayerId) {
      setActionState({ status: 'error', message: 'Select a player first.' });
      return;
    }
    if (!targetPlayerId) {
      setActionState({ status: 'error', message: 'Pick a target player first.' });
      return;
    }

    setActionState({ status: 'working', message: 'Triggering directed conversation...' });
    try {
      await startConversation({ playerId: selectedPlayerId, invitee: targetPlayerId });
      const target = roleLocatorEntries.find((entry) => entry.playerId === targetPlayerId);
      setActionState({
        status: 'ok',
        message: `Triggered a directed conversation with ${target?.name ?? targetPlayerId}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setActionState({ status: 'error', message: `Trigger failed: ${message}` });
    }
  }

  return (
    <div className="mt-6">
      <div className="box">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          Debug Toolbox
        </h2>
      </div>
      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          <p>Selected player: {selectedPlayer ? `${selectedPlayer.name} (${selectedPlayer.playerId})` : 'none'}</p>
          <p>Current thought level: {thoughtLevel}</p>

          <button className="rounded bg-clay-700 px-3 py-1" onClick={startSocialNow}>
            Start social now
          </button>

          <button className="rounded bg-clay-700 px-3 py-1" onClick={stopSocialNow}>
            Stop social now
          </button>

          <label className="block">
            <span>Target player</span>
            <select
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={targetPlayerId ?? ''}
              onChange={(event) =>
                setTargetPlayerId((event.target.value || undefined) as GameId<'players'> | undefined)
              }
            >
              <option value="">Select a target player</option>
              {candidateTargets.map((entry) => (
                <option key={entry.playerId} value={entry.playerId}>
                  {entry.name} ({entry.playerId})
                </option>
              ))}
            </select>
          </label>

          <button className="rounded bg-clay-700 px-3 py-1" onClick={startSocialWithTarget}>
            Start social with selected target
          </button>

          <hr className="border-brown-600 my-3" />

          <label className="block">
            <span>Thought level</span>
            <select
              className="mt-1 w-full rounded bg-brown-900 px-2 py-1 text-brown-100"
              value={thoughtLevel}
              onChange={(event) => updateThoughtLevel(event.target.value as ThoughtLevel)}
            >
              <option value={THOUGHT_LEVELS.INTUITION}>Intuition</option>
              <option value={THOUGHT_LEVELS.THINK}>Think</option>
              <option value={THOUGHT_LEVELS.DEEP_THINK}>Deep think</option>
            </select>
            <p className="text-xs text-brown-200 mt-1">
              Deeper thinking uses more memory layers.
            </p>
          </label>

          <div className="flex items-center justify-between gap-3">
            <span className={`inline-block rounded px-2 py-0.5 text-xs ${statusClass(actionState.status)}`}>
              {actionState.status.toUpperCase()}
            </span>
            <span className="text-brown-200">Conversation debug</span>
          </div>
          <p>{actionState.message}</p>
        </div>
      </div>
    </div>
  );
}
