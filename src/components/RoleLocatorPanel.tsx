import { GameId } from "../../convex/aiTown/ids.ts";

export type RoleLocatorEntry = {
  playerId: GameId<"players">;
  name: string;
  character: string;
  position: { x: number; y: number };
};

export function RoleLocatorPanel({
  entries,
  onFocusPlayer,
}: {
  entries: RoleLocatorEntry[];
  onFocusPlayer: (playerId: GameId<"players">) => void;
}) {
  return (
    <div className="mb-6">
      <div className="box">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          角色定位
        </h2>
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          {entries.length === 0 && <p>当前没有可定位角色。</p>}
          {entries.map((entry) => (
            <div
              key={entry.playerId}
              className="flex items-center justify-between gap-3 border-b border-brown-600 pb-3 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-display text-lg truncate">{entry.name}</p>
                <p className="text-brown-200 truncate">{entry.character}</p>
                <p className="text-brown-300">
                  ({Math.floor(entry.position.x)},{" "}
                  {Math.floor(entry.position.y)})
                </p>
              </div>
              <button
                type="button"
                className="button text-white shadow-solid text-base cursor-pointer pointer-events-auto shrink-0"
                onClick={() => onFocusPlayer(entry.playerId)}
              >
                <span className="block h-full bg-clay-700 px-3 py-1">定位</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
