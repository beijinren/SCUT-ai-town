import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import Button from './buttons/Button';
import { toastOnError } from '../toasts';

export default function SceneSwitchControl() {
  const sceneOptions = useQuery(api.mapState.listSceneOptions);
  const selectScene = useMutation(api.mapState.selectScene);
  const hardResetWorldState = useMutation(api.testing.hardResetWorldState);
  const initWorld = useMutation(api.init.default);
  const [pendingMapId, setPendingMapId] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  const selectedMapId = sceneOptions?.selectedMapId ?? '';
  const maps = sceneOptions?.maps ?? [];

  useEffect(() => {
    if (!pendingMapId && selectedMapId) {
      setPendingMapId(selectedMapId);
    }
  }, [pendingMapId, selectedMapId]);

  const selectedMapLabel = useMemo(() => {
    return maps.find((item) => item.mapId === pendingMapId)?.label ?? pendingMapId;
  }, [maps, pendingMapId]);

  const onSwitch = async () => {
    if (!pendingMapId || isSwitching) {
      return;
    }
    const confirmed = window.confirm(
      `这会切换到“${selectedMapLabel}”并重建世界，当前旧对话和运行中的世界状态会被归档。要继续吗？`,
    );
    if (!confirmed) {
      return;
    }
    setIsSwitching(true);
    try {
      await toastOnError(selectScene({ mapId: pendingMapId }));
      await toastOnError(hardResetWorldState({}));
      await toastOnError(initWorld({}));
      window.location.reload();
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="mb-4 rounded border-4 border-brown-900 bg-brown-700/80 p-3 shadow-solid">
      <div className="mb-2 text-sm font-bold tracking-wide text-brown-100">场景切换</div>
      <div className="flex flex-col gap-3">
        <select
          value={pendingMapId}
          onChange={(event) => setPendingMapId(event.target.value)}
          disabled={isSwitching || maps.length === 0}
          className="w-full border-4 border-brown-900 bg-brown-800 px-3 py-2 text-base text-brown-100 outline-none"
        >
          {maps.map((map) => (
            <option key={map.mapId} value={map.mapId}>
              {map.label}
            </option>
          ))}
        </select>
        <Button
          onClick={onSwitch}
          className={isSwitching ? 'opacity-50 pointer-events-none' : ''}
          title="切换到选中的地图，并重建当前默认世界。"
          imgUrl="/assets/star.svg"
        >
          {isSwitching ? '切换中...' : '切换场景并重建'}
        </Button>
      </div>
    </div>
  );
}
