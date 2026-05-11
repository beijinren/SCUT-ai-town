import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ApiConnectionPanel, RoleLocatorEntry } from './ApiConnectionPanel.tsx';
import { GameId } from '../../convex/aiTown/ids.ts';
import { DebugToolboxPanel } from './DebugToolboxPanel.tsx';

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

export function SceneDebugPanel({
  worldId,
  engineId,
  selectedPlayerId,
  roleLocatorEntries,
  conversationByPlayerId,
  onFocusPlayer,
}: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  selectedPlayerId?: GameId<'players'>;
  roleLocatorEntries: RoleLocatorEntry[];
  conversationByPlayerId: Record<string, string | undefined>;
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
      <div className="desc">
        <p className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm">
          Loading debug data...
        </p>
      </div>
    );
  }

  const { scene, views, runtimeInteractionDecisions } = debugPayload;
  const shouldInitiateCount = runtimeInteractionDecisions.filter(
    (item) => item.decision?.shouldInitiate,
  ).length;

  return (
    <div>
      <ApiConnectionPanel roleLocatorEntries={roleLocatorEntries} onFocusPlayer={onFocusPlayer} />
      <DebugToolboxPanel
        engineId={engineId}
        worldId={worldId}
        selectedPlayerId={selectedPlayerId}
        roleLocatorEntries={roleLocatorEntries}
        conversationByPlayerId={conversationByPlayerId}
      />

      <div className="box">
        <h2 className="bg-brown-700 p-2 font-display text-2xl tracking-wider shadow-solid text-center">
          Runtime Debug Panel
        </h2>
      </div>
      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
          <p className="font-display text-lg">Runtime Snapshot</p>
          <p>sceneId: {scene.id}</p>
          <p>sceneType: {scene.type}</p>
          <p>currentPhase: {scene.currentPhase}</p>
          <p>pressureSourceCount: {scene.pressureSource.length}</p>
          <p>hiddenFactsCount: {scene.hiddenFacts.length}</p>
          <p>viewCount: {views.length}</p>
          <p>decisionCount: {runtimeInteractionDecisions.length}</p>
          <p>initiateCount: {shouldInitiateCount}</p>
        </div>
      </div>

      {runtimeSceneState && (
        <div className="desc mt-4">
          <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
            <p className="font-display text-lg">Runtime Scene Seed</p>
            <p>sceneId: {runtimeSceneState.sceneId}</p>
            <p>sceneType: {runtimeSceneState.sceneType}</p>
            <p>roleCount: {runtimeSceneState.roleIds.length}</p>
            <p>publicFactCount: {runtimeSceneState.publicFactIds.length}</p>
            <p>hiddenFactCount: {runtimeSceneState.hiddenFactIds.length}</p>
          </div>
        </div>
      )}

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-2">
          <p className="font-display text-lg">Role View Stats</p>
          {views.length === 0 && <p>No role views available.</p>}
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {views.map((view) => (
              <li key={view.role.id}>
                roleId={view.role.id}, permissionCount={view.availablePermissions.length}, visibleFactCount=
                {view.visibleFacts.length}, knownFactIdCount={view.role.knownFactIds.length}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="desc mt-4">
        <div className="leading-tight -m-4 bg-brown-700 text-base sm:text-sm p-4 space-y-3">
          <p className="font-display text-lg">Interaction Decisions</p>
          {runtimeInteractionDecisions.length === 0 && <p>No interaction decisions recorded yet.</p>}
          {runtimeInteractionDecisions.map((item) => (
            <div key={item.playerId} className="border-t border-brown-500 pt-3 first:border-t-0 first:pt-0">
              <p className="font-display">playerId: {item.playerId}</p>
              {item.decision ? (
                <>
                  <p className="text-brown-100 mt-1">
                    Result: {item.decision.shouldInitiate ? 'will initiate' : 'will not initiate'}
                  </p>
                  <p className="mt-1">Summary: {item.decision.summary}</p>
                  {item.decision.selectedPlayerId && <p className="mt-1">Target: {item.decision.selectedPlayerId}</p>}
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {item.decision.reasons.map((reason, index) => (
                      <li key={`${item.playerId}-reason-${index}`}>{reason}</li>
                    ))}
                  </ul>
                  {item.decision.topCandidateScores.length > 0 && (
                    <div className="mt-2">
                      <p>Candidate scores:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {item.decision.topCandidateScores.map((candidate) => (
                          <li key={`${item.playerId}-${candidate.playerId}`}>
                            {candidate.playerId}: {candidate.score.toFixed(1)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-brown-200 mt-1">No decision recorded.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
