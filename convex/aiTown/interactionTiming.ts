import { distance } from '../util/geometry';
import { SceneWorldSeed } from './sceneTypes';
import { SerializedPlayer } from './player';

export interface InteractionTargetCandidate {
  player: SerializedPlayer;
  source: 'free_player' | 'active_conversation';
  conversationId?: string;
  participantCount?: number;
}

export interface InteractionDecisionReason {
  code: string;
  message: string;
  scoreDelta?: number;
}

export interface InteractionCandidateScore {
  playerId: string;
  score: number;
  distance: number;
  source: 'free_player' | 'active_conversation';
  conversationId?: string;
  participantCount?: number;
  reasons: InteractionDecisionReason[];
}

export interface InteractionDecisionResult {
  shouldInitiate: boolean;
  selectedPlayerId?: string;
  summary: string;
  threshold: number;
  reasons: InteractionDecisionReason[];
  candidateScores: InteractionCandidateScore[];
}

function sceneEncouragesApproach(sceneState?: SceneWorldSeed) {
  const tone = sceneState?.tone ?? '';
  const phase = sceneState?.currentPhase ?? '';
  const toneBoost =
    tone.includes('轻松') || tone.includes('开放') || tone.includes('低压力');
  const phaseBoost =
    phase.includes('free') || phase.includes('light') || phase.includes('open');
  return toneBoost || phaseBoost;
}

function sceneDiscouragesApproach(sceneState?: SceneWorldSeed) {
  const tone = sceneState?.tone ?? '';
  return tone.includes('紧张') || tone.includes('敌意') || tone.includes('高压');
}

function scoreCandidate(
  player: SerializedPlayer,
  candidate: InteractionTargetCandidate,
  sceneState?: SceneWorldSeed,
): InteractionCandidateScore {
  const candidateReasons: InteractionDecisionReason[] = [];
  let score = 0;
  const candidateDistance = distance(player.position, candidate.player.position);

  if (candidateDistance <= 4) {
    score += 3;
    candidateReasons.push({
      code: 'nearby',
      message: '目标就在附近，主动接触成本很低。',
      scoreDelta: 3,
    });
  } else if (candidateDistance <= 8) {
    score += 2;
    candidateReasons.push({
      code: 'moderately_nearby',
      message: '目标距离适中，具备接触条件。',
      scoreDelta: 2,
    });
  } else if (candidateDistance <= 14) {
    score += 1;
    candidateReasons.push({
      code: 'reachable',
      message: '目标可接近，但需要一定移动。',
      scoreDelta: 1,
    });
  } else {
    candidateReasons.push({
      code: 'far_away',
      message: '目标较远，主动接触成本偏高。',
      scoreDelta: 0,
    });
  }

  if (candidate.player.activity) {
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
      message: '当前场景氛围更鼓励自然搭话。',
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

  if (candidate.source === 'active_conversation') {
    score += 1.5;
    candidateReasons.push({
      code: 'active_conversation_bonus',
      message: '目标当前处在已开始的会话里，加入后更容易快速形成多人交流。',
      scoreDelta: 1.5,
    });
    if (candidate.participantCount && candidate.participantCount >= 2) {
      const additionalScore = Math.min(1, (candidate.participantCount - 1) * 0.5);
      score += additionalScore;
      candidateReasons.push({
        code: 'group_size_bonus',
        message: `当前会话已有 ${candidate.participantCount} 人，具备扩展成多人交流的基础。`,
        scoreDelta: additionalScore,
      });
    }
  }

  return {
    playerId: candidate.player.id,
    score,
    distance: candidateDistance,
    source: candidate.source,
    conversationId: candidate.conversationId,
    participantCount: candidate.participantCount,
    reasons: candidateReasons,
  };
}

export function decideInteractionTiming(args: {
  player: SerializedPlayer;
  interactionCandidates: InteractionTargetCandidate[];
  sceneState?: SceneWorldSeed;
  justLeftConversation: boolean;
  recentlyAttemptedInvite: boolean;
  doingActivity: boolean;
}): InteractionDecisionResult {
  const {
    player,
    interactionCandidates,
    sceneState,
    justLeftConversation,
    recentlyAttemptedInvite,
    doingActivity,
  } = args;
  const reasons: InteractionDecisionReason[] = [];
  const threshold = 2.5;

  if (doingActivity) {
    reasons.push({
      code: 'doing_activity',
      message: '当前仍在活动中，暂不主动发起互动。',
    });
    return {
      shouldInitiate: false,
      summary: '当前在进行活动，保持观察。',
      threshold,
      reasons,
      candidateScores: [],
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
      threshold,
      reasons,
      candidateScores: [],
    };
  }

  if (recentlyAttemptedInvite) {
    reasons.push({
      code: 'recent_attempt',
      message: '刚尝试过主动接触，短时间内不再重复尝试。',
    });
    return {
      shouldInitiate: false,
      summary: '最近刚尝试过互动，先避免连续发起。',
      threshold,
      reasons,
      candidateScores: [],
    };
  }

  if (interactionCandidates.length === 0) {
    reasons.push({
      code: 'no_candidates',
      message: '当前没有合适的接触对象，也没有可加入的现有会话。',
    });
    return {
      shouldInitiate: false,
      summary: '没有找到合适的互动对象。',
      threshold,
      reasons,
      candidateScores: [],
    };
  }

  const candidateScores = interactionCandidates
    .map((candidate) => scoreCandidate(player, candidate, sceneState))
    .sort((a, b) => b.score - a.score);

  const bestCandidate = candidateScores[0];
  reasons.push(
    ...bestCandidate.reasons,
    {
      code: 'best_candidate_score',
      message: `当前最佳候选对象得分为 ${bestCandidate.score.toFixed(1)}。`,
    },
  );

  if (bestCandidate.score >= threshold) {
    return {
      shouldInitiate: true,
      selectedPlayerId: bestCandidate.playerId,
      summary: `决定主动接触 ${bestCandidate.playerId}。`,
      threshold,
      reasons,
      candidateScores,
    };
  }

  reasons.push({
    code: 'below_threshold',
    message: `最佳候选对象得分低于阈值 ${threshold}，继续等待更合适时机。`,
  });
  return {
    shouldInitiate: false,
    summary: '当前没有足够强的主动交互时机。',
    threshold,
    reasons,
    candidateScores,
  };
}
