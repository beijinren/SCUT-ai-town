import { distance } from '../util/geometry';
import { SerializedPlayer } from './player';
import { SceneWorldSeed } from './sceneTypes';
import { EnvironmentContext, SemanticActionCandidate } from './semanticEnvironment';

export interface InteractionDecisionReason {
  code: string;
  message: string;
  scoreDelta?: number;
}

export interface InteractionCandidateScore {
  playerId: string;
  score: number;
  distance: number;
  reasons: InteractionDecisionReason[];
}

export interface InteractionDecisionResult {
  shouldInitiate: boolean;
  selectedPlayerId?: string;
  summary: string;
  threshold: number;
  reasons: InteractionDecisionReason[];
  candidateScores: InteractionCandidateScore[];
  environmentContext?: EnvironmentContext;
  semanticActionCandidates?: SemanticActionCandidate[];
  selectedSemanticAction?: SemanticActionCandidate;
  semanticTriggered?: boolean;
}

function sceneEncouragesApproach(sceneState?: SceneWorldSeed) {
  const tone = sceneState?.tone ?? '';
  const phase = sceneState?.currentPhase ?? '';
  const toneBoost =
    tone.includes('轻松') ||
    tone.includes('开放') ||
    tone.includes('低压力') ||
    tone.includes('casual') ||
    tone.includes('open');
  const phaseBoost = phase.includes('free') || phase.includes('light') || phase.includes('open');
  return toneBoost || phaseBoost;
}

function sceneDiscouragesApproach(sceneState?: SceneWorldSeed) {
  const tone = sceneState?.tone ?? '';
  return tone.includes('紧张') || tone.includes('敌意') || tone.includes('高压力');
}

function scoreCandidate(
  player: SerializedPlayer,
  otherPlayer: SerializedPlayer,
  sceneState?: SceneWorldSeed,
): InteractionCandidateScore {
  const candidateReasons: InteractionDecisionReason[] = [];
  let score = 0;
  const candidateDistance = distance(player.position, otherPlayer.position);

  if (candidateDistance <= 4) {
    score += 3;
    candidateReasons.push({
      code: 'nearby',
      message: '目标就在附近，主动接触成本低。',
      scoreDelta: 3,
    });
  } else if (candidateDistance <= 8) {
    score += 2;
    candidateReasons.push({
      code: 'moderately_nearby',
      message: '目标距离适中，具备主动接触条件。',
      scoreDelta: 2,
    });
  } else if (candidateDistance <= 14) {
    score += 1;
    candidateReasons.push({
      code: 'reachable',
      message: '目标可以接近，但需要一定移动。',
      scoreDelta: 1,
    });
  } else {
    candidateReasons.push({
      code: 'far_away',
      message: '目标较远，主动接触成本偏高。',
      scoreDelta: 0,
    });
  }

  if (otherPlayer.activity) {
    score -= 1.5;
    candidateReasons.push({
      code: 'target_busy',
      message: '目标当前有活动，贸然打断收益偏低。',
      scoreDelta: -1.5,
    });
  }

  if (sceneEncouragesApproach(sceneState)) {
    score += 1;
    candidateReasons.push({
      code: 'scene_encourages_approach',
      message: '当前场景氛围鼓励自然搭话。',
      scoreDelta: 1,
    });
  } else if (sceneDiscouragesApproach(sceneState)) {
    score -= 1;
    candidateReasons.push({
      code: 'scene_discourages_approach',
      message: '当前场景氛围不太鼓励主动接触。',
      scoreDelta: -1,
    });
  }

  return {
    playerId: otherPlayer.id,
    score,
    distance: candidateDistance,
    reasons: candidateReasons,
  };
}

function semanticReasonMessages(candidate: SemanticActionCandidate): InteractionDecisionReason[] {
  return candidate.reasons.map((message, index) => ({
    code: `semantic_${candidate.kind}_${index}`,
    message,
  }));
}

function summarizeSemanticAction(candidate: SemanticActionCandidate) {
  switch (candidate.kind) {
    case 'approach_player':
      return `空间语义建议主动接触 ${candidate.targetPlayerId}。`;
    case 'move_to_object':
      return `空间语义建议先移动到物品 ${candidate.targetObjectId} 附近。`;
    case 'move_to_area':
      return `空间语义建议先移动到区域 ${candidate.targetAreaId}。`;
    case 'wait':
      return '空间语义建议暂时等待。';
  }
}

function baseResult(args: {
  threshold: number;
  reasons: InteractionDecisionReason[];
  candidateScores?: InteractionCandidateScore[];
  environmentContext?: EnvironmentContext;
  semanticActionCandidates?: SemanticActionCandidate[];
}) {
  return {
    threshold: args.threshold,
    reasons: args.reasons,
    candidateScores: args.candidateScores ?? [],
    environmentContext: args.environmentContext,
    semanticActionCandidates: args.semanticActionCandidates,
  };
}

export function decideInteractionTiming(args: {
  player: SerializedPlayer;
  otherFreePlayers: SerializedPlayer[];
  sceneState?: SceneWorldSeed;
  justLeftConversation: boolean;
  recentlyAttemptedInvite: boolean;
  doingActivity: boolean;
  environmentContext?: EnvironmentContext;
  semanticActionCandidates?: SemanticActionCandidate[];
}): InteractionDecisionResult {
  const {
    player,
    otherFreePlayers,
    sceneState,
    justLeftConversation,
    recentlyAttemptedInvite,
    doingActivity,
    environmentContext,
    semanticActionCandidates,
  } = args;
  const reasons: InteractionDecisionReason[] = [];
  const threshold = 2.5;
  const candidateScores = otherFreePlayers
    .map((otherPlayer) => scoreCandidate(player, otherPlayer, sceneState))
    .sort((a, b) => b.score - a.score);
  const semanticCandidates = semanticActionCandidates ?? [];
  const bestSemanticCandidate = semanticCandidates[0];

  if (doingActivity) {
    reasons.push({
      code: 'doing_activity',
      message: '当前仍在活动中，暂不主动发起互动。',
    });
    return {
      shouldInitiate: false,
      summary: '当前在进行活动，保持观察。',
      semanticTriggered: false,
      ...baseResult({ threshold, reasons, candidateScores, environmentContext, semanticActionCandidates }),
    };
  }

  if (justLeftConversation) {
    reasons.push({
      code: 'conversation_cooldown',
      message: '刚结束一轮对话，先进入冷却期。',
    });
    return {
      shouldInitiate: false,
      summary: '刚结束对话，暂缓再次主动接触。',
      semanticTriggered: false,
      ...baseResult({ threshold, reasons, candidateScores, environmentContext, semanticActionCandidates }),
    };
  }

  if (recentlyAttemptedInvite) {
    reasons.push({
      code: 'recent_attempt',
      message: '刚尝试过主动接触，短时间内不重复尝试。',
    });
    return {
      shouldInitiate: false,
      summary: '最近刚尝试过互动，先避免连续发起。',
      semanticTriggered: false,
      ...baseResult({ threshold, reasons, candidateScores, environmentContext, semanticActionCandidates }),
    };
  }

  if (bestSemanticCandidate && bestSemanticCandidate.score >= threshold) {
    const semanticReasons = [
      ...semanticReasonMessages(bestSemanticCandidate),
      {
        code: 'semantic_best_candidate_score',
        message: `空间语义候选得分为 ${bestSemanticCandidate.score.toFixed(1)}。`,
      },
    ];
    reasons.push(...semanticReasons);

    if (bestSemanticCandidate.kind === 'approach_player') {
      return {
        shouldInitiate: true,
        selectedPlayerId: bestSemanticCandidate.targetPlayerId,
        selectedSemanticAction: bestSemanticCandidate,
        semanticTriggered: true,
        summary: summarizeSemanticAction(bestSemanticCandidate),
        ...baseResult({ threshold, reasons, candidateScores, environmentContext, semanticActionCandidates }),
      };
    }

    return {
      shouldInitiate: false,
      selectedSemanticAction: bestSemanticCandidate,
      semanticTriggered: true,
      summary: summarizeSemanticAction(bestSemanticCandidate),
      ...baseResult({ threshold, reasons, candidateScores, environmentContext, semanticActionCandidates }),
    };
  }

  if (otherFreePlayers.length === 0) {
    reasons.push({
      code: 'no_candidates',
      message: '当前没有可接触的空闲对象。',
    });
    return {
      shouldInitiate: false,
      summary: '没有找到合适的互动对象。',
      semanticTriggered: false,
      ...baseResult({ threshold, reasons, candidateScores, environmentContext, semanticActionCandidates }),
    };
  }

  const bestCandidate = candidateScores[0];
  reasons.push(...bestCandidate.reasons, {
    code: 'best_candidate_score',
    message: `当前最佳候选对象得分为 ${bestCandidate.score.toFixed(1)}。`,
  });

  if (bestCandidate.score >= threshold) {
    return {
      shouldInitiate: true,
      selectedPlayerId: bestCandidate.playerId,
      summary: `决定主动接触 ${bestCandidate.playerId}。`,
      semanticTriggered: false,
      ...baseResult({ threshold, reasons, candidateScores, environmentContext, semanticActionCandidates }),
    };
  }

  reasons.push({
    code: 'below_threshold',
    message: `最佳候选对象得分低于阈值 ${threshold}，继续等待更合适时机。`,
  });
  return {
    shouldInitiate: false,
    summary: '当前没有足够强的主动交互时机。',
    semanticTriggered: false,
    ...baseResult({ threshold, reasons, candidateScores, environmentContext, semanticActionCandidates }),
  };
}
