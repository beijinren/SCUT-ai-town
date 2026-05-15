import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

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

type EnvironmentContextDebug = {
  playerId: string;
  currentArea?: {
    id: string;
    name: string;
    type: string;
    tags: string[];
    socialMeaning: string;
  };
  nearbyObjects: Array<{
    id: string;
    name: string;
    type: string;
    distance: number;
    affordances: string[];
    tags: string[];
    interactable: boolean;
    description: string;
  }>;
  nearbyPeople: Array<{
    playerId: string;
    distance: number;
    isInConversation: boolean;
    activity?: string;
  }>;
  environmentHints: string[];
};

type SemanticActionCandidateDebug = {
  kind: string;
  score: number;
  reasons: string[];
  targetPlayerId?: string;
  targetObjectId?: string;
  targetAreaId?: string;
  destination?: { x: number; y: number };
};

type DebugView = {
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
      environmentContext?: EnvironmentContextDebug;
      semanticActionCandidates?: SemanticActionCandidateDebug[];
      selectedSemanticAction?: SemanticActionCandidateDebug;
      semanticTriggered?: boolean;
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

function CandidateTarget({ candidate }: { candidate: SemanticActionCandidateDebug }) {
  if (candidate.targetPlayerId) {
    return <span>目标角色：{candidate.targetPlayerId}</span>;
  }
  if (candidate.targetObjectId) {
    return <span>目标物品：{candidate.targetObjectId}</span>;
  }
  if (candidate.targetAreaId) {
    return <span>目标区域：{candidate.targetAreaId}</span>;
  }
  return <span>无目标</span>;
}

function SemanticDecisionDetails({
  context,
  candidates,
  selected,
  triggered,
}: {
  context?: EnvironmentContextDebug;
  candidates?: SemanticActionCandidateDebug[];
  selected?: SemanticActionCandidateDebug;
  triggered?: boolean;
}) {
  if (!context && (!candidates || candidates.length === 0)) {
    return <p className="text-brown-200 mt-2">暂无空间语义数据，当前使用原主动交互逻辑。</p>;
  }

  return (
    <div className="mt-3 rounded bg-brown-800/40 p-3 space-y-3">
      <p className="font-display text-lg">空间语义决策链路</p>
      <p>是否由空间语义触发：{triggered ? '是' : '否'}</p>
      {context?.currentArea ? (
        <div>
          <p>当前区域：{context.currentArea.name}</p>
          <p className="text-brown-200">区域含义：{context.currentArea.socialMeaning}</p>
          <p className="text-brown-200">区域标签：{context.currentArea.tags.join('、') || '无'}</p>
        </div>
      ) : (
        <p>当前区域：未识别</p>
      )}

      <div>
        <p>附近物品：</p>
        {context?.nearbyObjects?.length ? (
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {context.nearbyObjects.map((object) => (
              <li key={object.id}>
                {object.name}，距离 {object.distance.toFixed(1)}，能力：
                {object.affordances.join('、') || '无'}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-brown-200">无</p>
        )}
      </div>

      <div>
        <p>附近人物：</p>
        {context?.nearbyPeople?.length ? (
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {context.nearbyPeople.map((person) => (
              <li key={person.playerId}>
                {person.playerId}，距离 {person.distance.toFixed(1)}，
                {person.isInConversation ? '正在对话' : '空闲'}
                {person.activity ? `，活动：${person.activity}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-brown-200">无</p>
        )}
      </div>

      <div>
        <p>环境提示：</p>
        {context?.environmentHints?.length ? (
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {context.environmentHints.map((hint, index) => (
              <li key={`hint-${index}`}>{hint}</li>
            ))}
          </ul>
        ) : (
          <p className="text-brown-200">无</p>
        )}
      </div>

      <div>
        <p>候选行为：</p>
        {candidates?.length ? (
          <ul className="list-disc pl-5 mt-1 space-y-2">
            {candidates.map((candidate, index) => (
              <li key={`${candidate.kind}-${index}`}>
                <p>
                  {candidate.kind}，得分 {candidate.score.toFixed(1)}，<CandidateTarget candidate={candidate} />
                </p>
                {candidate.destination && (
                  <p className="text-brown-200">
                    目标点：({candidate.destination.x}, {candidate.destination.y})
                  </p>
                )}
                <p className="text-brown-200">理由：{candidate.reasons.join('；') || '无'}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-brown-200">无</p>
        )}
      </div>

      {selected && (
        <p>
          最终语义选择：{selected.kind}，得分 {selected.score.toFixed(1)}
        </p>
      )}
    </div>
  );
}

export function SceneDebugPanel({ worldId }: { worldId: Id<'worlds'> }) {
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
          <p>压力来源：{scene.pressureSource.join('、') || '无'}</p>
        </div>
      </div>

      {runtimeSceneState && (
        <div className="desc mt-4">
          <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
            <p className="font-display text-lg">运行时 Scene Seed</p>
            <p>sceneId：{runtimeSceneState.sceneId}</p>
            <p>sceneType：{runtimeSceneState.sceneType}</p>
            <p>角色名：{runtimeSceneState.roleNames.join('、') || '无'}</p>
            <p>公开事实 ID：{runtimeSceneState.publicFactIds.join('、') || '无'}</p>
            <p>隐藏事实 ID：{runtimeSceneState.hiddenFactIds.join('、') || '无'}</p>
          </div>
        </div>
      )}

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
          <p className="font-display text-lg">全局隐藏信息</p>
          <p>这些信息不会直接进入角色视图，只用于说明后续可暴露的事实。</p>
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
                <div className="text-right text-brown-100">
                  <p>{view.availablePermissions.length} 个当前权限</p>
                  <p>{view.visibleFacts.length} 条可见事实</p>
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
                  <SemanticDecisionDetails
                    context={item.decision.environmentContext}
                    candidates={item.decision.semanticActionCandidates}
                    selected={item.decision.selectedSemanticAction}
                    triggered={item.decision.semanticTriggered}
                  />
                </>
              ) : (
                <p className="text-brown-200 mt-1">暂无决策记录。</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
