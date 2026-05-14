import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { GameId } from '../../convex/aiTown/ids';

type FactRecord = {
  id: string;
  title: string;
  content: string;
  visibility: string;
  ownerRoleIds: string[];
  sharedWithRoleIds: string[];
  revealCondition?: string;
  tags?: string[];
};

type DebugView = {
  playerId: GameId<'players'> | null;
  sceneId: string;
  sceneType: string;
  title: string;
  publicSummary: string;
  location: string;
  tone: string;
  currentPhase: string;
  pressureSource: string[];
  role: {
    id: string;
    name: string;
    identity: string;
    publicGoal: string;
    privateGoal: string;
    defaultPermissions: string[];
    knownFactIds: string[];
  };
  visibleFacts: FactRecord[];
  availablePermissions: string[];
};

type DebugPayload = {
  scene: {
    id: string;
    type: string;
    title: string;
    publicSummary: string;
    location: string;
    tone: string;
    currentPhase: string;
    pressureSource: string[];
    hiddenFacts: FactRecord[];
  };
  views: DebugView[];
  runtimeInteractionDecisions: Array<{
    playerId: string;
    playerName: string;
    decision: {
      timestamp: number;
      shouldInitiate: boolean;
      selectedPlayerId?: string;
      summary: string;
      reasons: string[];
      topCandidateScores: Array<{ playerId: string; score: number }>;
    } | null;
  }>;
};

function visibilityBadgeClass(visibility: string) {
  switch (visibility) {
    case 'public':
      return 'bg-green-700 text-green-50';
    case 'private':
      return 'bg-blue-700 text-blue-50';
    case 'shared':
      return 'bg-amber-700 text-amber-50';
    case 'hidden':
      return 'bg-rose-700 text-rose-50';
    default:
      return 'bg-brown-600 text-brown-50';
  }
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${visibilityBadgeClass(
        visibility,
      )}`}
    >
      {visibility}
    </span>
  );
}

export function SceneDebugPanel({
  worldId,
  onFocusPlayer,
}: {
  worldId: Id<'worlds'>;
  onFocusPlayer: (playerId: GameId<'players'>) => void;
}) {
  const worldApi = api.world as any;
  const debugPayload = useQuery(worldApi.sceneDebugViews, { worldId }) as DebugPayload | undefined;
  const runtimeSceneState = useQuery(worldApi.currentSceneState, { worldId }) as
    | {
        sceneId: string;
        sceneType: string;
        title: string;
        publicSummary: string;
        location: string;
        tone: string;
        currentPhase: string;
        pressureSource: string[];
        roleIds: string[];
        roleNames: string[];
        publicFactIds: string[];
        hiddenFactIds: string[];
      }
    | null
    | undefined;

  if (!debugPayload) {
    return (
      <div className="mt-6 desc">
        <p className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm">
          正在加载场景调试视图...
        </p>
      </div>
    );
  }

  const { scene, views, runtimeInteractionDecisions } = debugPayload;

  return (
    <div className="mt-6">
      <div className="box">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          场景调试面板
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
          <p>压力来源：{scene.pressureSource.join('、')}</p>
        </div>
      </div>

      {runtimeSceneState && (
        <div className="desc mt-4">
          <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
            <p className="font-display text-lg">运行时 Scene Seed</p>
            <p>sceneId：{runtimeSceneState.sceneId}</p>
            <p>sceneType：{runtimeSceneState.sceneType}</p>
            <p>角色名：{runtimeSceneState.roleNames.join('、')}</p>
            <p>公开事实 ID：{runtimeSceneState.publicFactIds.join('、') || '无'}</p>
            <p>隐藏事实 ID：{runtimeSceneState.hiddenFactIds.join('、') || '无'}</p>
          </div>
        </div>
      )}

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
          <p className="font-display text-lg">全局隐藏信息</p>
          <p>这些信息当前不会直接出现在任何角色视图里，只用于说明后续可暴露的事实。</p>
          <ul className="list-disc pl-5 mt-1 space-y-2">
            {scene.hiddenFacts.map((fact) => (
              <li key={fact.id}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{fact.title}</span>
                  <VisibilityBadge visibility={fact.visibility} />
                </div>
                <div className="mt-1">{fact.content}</div>
                {fact.revealCondition && (
                  <div className="mt-1 text-brown-200">暴露条件：{fact.revealCondition}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {views.map((view, index) => (
          <details key={view.role.id} className="desc" open={index === 0}>
            <summary className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2 cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-lg">{view.role.name}</p>
                  <p className="text-brown-200">{view.role.identity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-brown-100">
                    <p>{view.availablePermissions.length} 个当前权限</p>
                    <p>{view.visibleFacts.length} 条可见事实</p>
                  </div>
                  {view.playerId && (
                    <button
                      type="button"
                      className="button text-white shadow-solid text-xs cursor-pointer pointer-events-auto shrink-0"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onFocusPlayer(view.playerId as GameId<'players'>);
                      }}
                    >
                      <span className="block h-full bg-clay-700 px-2 py-1">定位</span>
                    </button>
                  )}
                </div>
              </div>
            </summary>
            <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm px-4 pb-4 pt-2 space-y-3 border-t border-brown-500">
              <p>公开目标：{view.role.publicGoal}</p>
              <p>私下目标：{view.role.privateGoal}</p>
              <div>
                <p>当前权限：</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {view.availablePermissions.length > 0 ? (
                    view.availablePermissions.map((permission) => (
                      <span
                        key={permission}
                        className="inline-block rounded bg-clay-700 px-2 py-1 text-xs uppercase tracking-wide"
                      >
                        {permission}
                      </span>
                    ))
                  ) : (
                    <span className="text-brown-200">无</span>
                  )}
                </div>
              </div>
              <div>
                <p>可见事实：</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  {view.visibleFacts.map((fact) => (
                    <li key={fact.id}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{fact.title}</span>
                        <VisibilityBadge visibility={fact.visibility} />
                      </div>
                      <div className="mt-1">{fact.content}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        ))}
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          <p className="font-display text-lg">主动交互决策</p>
          {runtimeInteractionDecisions.length === 0 && (
            <p>当前还没有记录到新的主动交互决策。</p>
          )}
          {runtimeInteractionDecisions.map((item) => (
            <div key={item.playerId} className="border-t border-brown-500 pt-3 first:border-t-0 first:pt-0">
              <p className="font-display">{item.playerName}</p>
              {item.decision ? (
                <>
                  <p className="text-brown-100 mt-1">
                    结果：{item.decision.shouldInitiate ? '准备主动接触' : '暂不主动接触'}
                  </p>
                  <p className="mt-1">摘要：{item.decision.summary}</p>
                  {item.decision.selectedPlayerId && (
                    <p className="mt-1">目标：{item.decision.selectedPlayerId}</p>
                  )}
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {item.decision.reasons.map((reason, index) => (
                      <li key={`${item.playerId}-reason-${index}`}>{reason}</li>
                    ))}
                  </ul>
                  {item.decision.topCandidateScores.length > 0 && (
                    <div className="mt-2">
                      <p>候选对象分数：</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {item.decision.topCandidateScores.map((candidate) => (
                          <li key={`${item.playerId}-${candidate.playerId}`}>
                            {candidate.playerId}：{candidate.score.toFixed(1)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-brown-200 mt-1">尚无决策记录。</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
