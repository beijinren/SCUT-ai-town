import { useRef, useState } from "react";
import PixiGame from "./PixiGame.tsx";

import { useElementSize } from "usehooks-ts";
import { Stage } from "@pixi/react";
import { ConvexProvider, useConvex, useQuery } from "convex/react";
import PlayerDetails from "./PlayerDetails.tsx";
import { api } from "../../convex/_generated/api";
import { useWorldHeartbeat } from "../hooks/useWorldHeartbeat.ts";
import { useHistoricalTime } from "../hooks/useHistoricalTime.ts";
import { DebugTimeManager } from "./DebugTimeManager.tsx";
import { GameId } from "../../convex/aiTown/ids.ts";
import { useServerGame } from "../hooks/serverGame.ts";
import { SceneDebugPanel } from "./SceneDebugPanel.tsx";
import { SceneInfoPanel } from "./SceneInfoPanel.tsx";
import { GMDebugPanel } from "./GMDebugPanel.tsx";
import ResetWorldButton from "./ResetWorldButton.tsx";

export const SHOW_DEBUG_UI = !!import.meta.env.VITE_SHOW_DEBUG_UI;
const SHOW_DEV_RESET_BUTTON = import.meta.env.DEV;

export default function Game() {
  const convex = useConvex();
  const [selectedElement, setSelectedElement] = useState<{
    kind: "player";
    id: GameId<"players">;
  }>();
  const [focusRequestId, setFocusRequestId] = useState(0);
  const [focusPlayerId, setFocusPlayerId] = useState<
    GameId<"players"> | undefined
  >();
  const [gameWrapperRef, { width, height }] = useElementSize();

  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const engineId = worldStatus?.engineId;

  const game = useServerGame(worldId);

  // Send a periodic heartbeat to our world to keep it alive.
  useWorldHeartbeat();

  const worldState = useQuery(
    api.world.worldState,
    worldId ? { worldId } : "skip",
  );
  const { historicalTime, timeManager } = useHistoricalTime(worldState?.engine);

  const scrollViewRef = useRef<HTMLDivElement>(null);

  if (!worldId || !engineId || !game) {
    return null;
  }

  const focusOnPlayer = (playerId: GameId<"players">) => {
    setSelectedElement({ kind: "player", id: playerId });
    setFocusPlayerId(playerId);
    setFocusRequestId((value) => value + 1);
  };

  const clearFocusedPlayer = () => {
    setSelectedElement(undefined);
    setFocusPlayerId(undefined);
    setFocusRequestId((value) => value + 1);
  };

  return (
    <>
      {SHOW_DEBUG_UI && (
        <DebugTimeManager timeManager={timeManager} width={200} height={100} />
      )}
      <div className="mx-auto w-full max-w grid grid-rows-[240px_1fr] lg:grid-rows-[1fr] lg:grid-cols-[1fr_auto] lg:grow max-w-[1400px] min-h-[480px] game-frame">
        {/* Game area */}
        <div
          className="relative overflow-hidden bg-brown-900"
          ref={gameWrapperRef}
        >
          <div className="absolute inset-0">
            <div className="container">
              <Stage
                width={width}
                height={height}
                options={{ backgroundColor: 0x7ab5ff }}
              >
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
                  semanticDebugPlayerId={selectedElement?.id}
                />
              </ConvexProvider>
            </Stage>
            </div>
          </div>
        </div>
        {/* Right column area */}
        <div
          className="flex flex-col overflow-y-auto shrink-0 px-4 py-6 sm:px-6 lg:w-96 xl:pr-6 border-t-8 sm:border-t-0 sm:border-l-8 border-brown-900  bg-brown-800 text-brown-100"
          ref={scrollViewRef}
        >
          {SHOW_DEV_RESET_BUTTON && <ResetWorldButton />}
          <PlayerDetails
            worldId={worldId}
            engineId={engineId}
            game={game}
            playerId={selectedElement?.id}
            setSelectedElement={setSelectedElement}
            onCloseSelection={clearFocusedPlayer}
            scrollViewRef={scrollViewRef}
          />
          <SceneInfoPanel worldId={worldId} />
          <SceneDebugPanel worldId={worldId} onFocusPlayer={focusOnPlayer} />
          <GMDebugPanel worldId={worldId} />
        </div>
      </div>
    </>
  );
}
