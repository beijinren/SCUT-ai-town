import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type SceneInfoPayload = {
  scene: {
    id: string;
    type: string;
    title: string;
    publicSummary: string;
    location: string;
    tone: string;
    currentPhase: string;
    pressureSource: string[];
  };
};

export function SceneInfoPanel({ worldId }: { worldId: Id<"worlds"> }) {
  const worldApi = api.world as any;
  const infoPayload = useQuery(worldApi.sceneDebugViews, { worldId }) as
    | SceneInfoPayload
    | undefined;
  const runtimeSceneState = useQuery(worldApi.currentSceneState, {
    worldId,
  }) as
    | {
        sceneId: string;
        sceneType: string;
        roleNames: string[];
        publicFactIds: string[];
        hiddenFactIds: string[];
      }
    | null
    | undefined;

  if (!infoPayload) {
    return (
      <div className="mt-6 desc">
        <p className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm">
          正在加载场景信息...
        </p>
      </div>
    );
  }

  const { scene } = infoPayload;

  return (
    <div className="mt-6">
      <div className="box">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          场景信息
        </h2>
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
          <p>场景：{scene.title}</p>
          <p>类型：{scene.type}</p>
          <p>地点：{scene.location}</p>
          <p>阶段：{scene.currentPhase}</p>
          <p>氛围：{scene.tone}</p>
          <p>公开摘要：{scene.publicSummary}</p>
          <p>压力来源：{scene.pressureSource.join("、") || "无"}</p>
        </div>
      </div>

      {runtimeSceneState && (
        <div className="desc mt-4">
          <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
            <p className="font-display text-lg">场景内角色与事实</p>
            <p>角色名：{runtimeSceneState.roleNames.join("、") || "无"}</p>
            <p>
              公开事实 ID：{runtimeSceneState.publicFactIds.join("、") || "无"}
            </p>
            <p>
              隐藏事实 ID：{runtimeSceneState.hiddenFactIds.join("、") || "无"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
