import { useRef, useState } from 'react';
import PixiGame from './PixiGame.tsx';

import { useElementSize } from 'usehooks-ts';
import { Stage } from '@pixi/react';
import { ConvexProvider, useConvex, useQuery } from 'convex/react';
import PlayerDetails from './PlayerDetails.tsx';
import { api } from '../../convex/_generated/api';
import { useWorldHeartbeat } from '../hooks/useWorldHeartbeat.ts';
import { useHistoricalTime } from '../hooks/useHistoricalTime.ts';
import { DebugTimeManager } from './DebugTimeManager.tsx';
import { GameId } from '../../convex/aiTown/ids.ts';
import { useServerGame } from '../hooks/serverGame.ts';
import { SceneDebugPanel } from './SceneDebugPanel.tsx';
import { SceneInfoPanel } from './SceneInfoPanel.tsx';
import { RoleLocatorEntry } from './ApiConnectionPanel.tsx';
import { useMemoryAutoSync } from '../hooks/useMemoryAutoSync.ts';

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;

export default function Game() {
  const convex = useConvex();
  const [selectedElement, setSelectedElement] = useState<{
    kind: 'player';
    id: GameId<'players'>;
  }>();
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [focusPlayerId, setFocusPlayerId] = useState<GameId<'players'> | undefined>();
  const [gameWrapperRef, { width, height }] = useElementSize();

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);
  useMemoryAutoSync(worldId);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(api.world.worldState, worldId ? { worldId } : 'skip');
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  if (!worldId || !engineId || !game) {
    return null;
  }

  const roleLocatorEntries: RoleLocatorEntry[] = [...game.world.players.values()].map((player) => {
    const playerDescription = game.playerDescriptions.get(player.id);
    const agent = [...game.world.agents.values()].find((candidate) => candidate.playerId === player.id);
    const agentDescription = agent ? game.agentDescriptions.get(agent.id) : undefined;
    const playerConversation = game.world.playerConversation(player);
    const otherConversationPlayerId = playerConversation
      ? [...playerConversation.participants.keys()].find((participantId) => participantId !== player.id)
      : undefined;
    const otherConversationPlayer = otherConversationPlayerId
      ? game.world.players.get(otherConversationPlayerId)
      : undefined;
    const facing = (() => {
      const { dx, dy } = player.facing;
      if (dx === 1) return '向右';
      if (dx === -1) return '向左';
      if (dy === 1) return '向下';
      if (dy === -1) return '向上';
      return '未知';
    })();
    const activity = player.pathfinding
      ? player.pathfinding.state.kind === 'moving'
        ? `移动中 -> (${Math.floor(player.pathfinding.destination.x)}, ${Math.floor(
            player.pathfinding.destination.y,
          )})`
        : player.pathfinding.state.kind === 'waiting'
          ? '等待路径中'
          : '正在寻路'
      : player.activity && player.activity.until > Date.now()
        ? `正在执行：${player.activity.description}`
        : '空闲';
    const social = playerConversation
      ? `${otherConversationPlayer?.id ?? '未知对象'} ${otherConversationPlayer ? `(${game.playerDescriptions.get(otherConversationPlayer.id)?.name ?? otherConversationPlayer.id})` : ''} / ${[...playerConversation.participants.entries()]
          .map(([participantId, membership]) => {
            const name = game.playerDescriptions.get(participantId)?.name ?? participantId;
            const state = membership.status.kind;
            return `${name}:${state}`;
          })
          .join('，')}`
      : '未社交';
    return {
      playerId: player.id,
      name: playerDescription?.name ?? player.id,
      character: playerDescription?.character ?? 'unknown',
      position: { x: player.position.x, y: player.position.y },
      description: playerDescription?.description ?? '无描述',
      publicProfile: agentDescription?.publicProfile,
      facing,
      activity,
      social,
    };
  });

  const conversationByPlayerId: Record<string, string | undefined> = {};
  for (const conversation of game.world.conversations.values()) {
    for (const participantId of conversation.participants.keys()) {
      conversationByPlayerId[participantId] = conversation.id;
    }
  }

  const focusOnPlayer = (playerId: GameId<'players'>) => {
    setSelectedElement({ kind: 'player', id: playerId });
    setFocusPlayerId(playerId);
    setFocusRequestId((value) => value + 1);
  };

  return (
    <>
      {SHOW_DEBUG_UI && <DebugTimeManager timeManager={timeManager} width={200} height={100} />}
      <div className="mx-auto w-full max-w grid grid-rows-[260px_auto_1fr] lg:grid-rows-[1fr] lg:grid-cols-[420px_1fr_420px] lg:grow max-w-[1800px] min-h-[520px] game-frame">
        {/* Left debug area */}
        <div className="flex flex-col overflow-y-auto shrink-0 px-4 py-6 sm:px-6 border-t-8 lg:border-t-0 lg:border-r-8 border-brown-900 bg-brown-800 text-brown-100">
          <SceneDebugPanel
            worldId={worldId}
            engineId={engineId}
            selectedPlayerId={selectedElement?.id}
            roleLocatorEntries={roleLocatorEntries}
            conversationByPlayerId={conversationByPlayerId}
            onFocusPlayer={focusOnPlayer}
          />
        </div>
        {/* Game area */}
        <div className="relative overflow-hidden bg-brown-900" ref={gameWrapperRef}>
          <div className="absolute inset-0">
            <div className="container">
              <Stage width={width} height={height} options={{ backgroundColor: 0x7ab5ff }}>
                {/* Re-propagate context because contexts are not shared between renderers.
https://github.com/michalochman/react-pixi-fiber/issues/145#issuecomment-531549215 */}
                <ConvexProvider client={convex}>
                  <PixiGame
                    game={game}
                    worldId={worldId}
                    engineId={engineId}
                    width={width}
                    height={height}
                    historicalTime={historicalTime}
                    setSelectedElement={setSelectedElement}
                    focusPlayerId={focusPlayerId}
                    focusRequestId={focusRequestId}
                  />
                </ConvexProvider>
              </Stage>
            </div>
          </div>
        </div>
        {/* Right column area */}
        <div
          className="flex flex-col overflow-y-auto shrink-0 px-4 py-6 sm:px-6 lg:w-[420px] xl:pr-6 border-t-8 sm:border-t-0 sm:border-l-8 border-brown-900  bg-brown-800 text-brown-100"
          ref={scrollViewRef}
        >
          <PlayerDetails
            worldId={worldId}
            engineId={engineId}
            game={game}
            playerId={selectedElement?.id}
            setSelectedElement={setSelectedElement}
            scrollViewRef={scrollViewRef}
          />
          <SceneInfoPanel worldId={worldId} />
        </div>
      </div>
    </>
  );
}
