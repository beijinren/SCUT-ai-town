import { GMWillingnessContext, GMWillingnessScore } from '../gmTypes';

function addFactor(score: GMWillingnessScore, label: string, delta: number, reason: string) {
  score.score += delta;
  score.factors.push({ label, delta, reason });
}

export function calculateWillingnessScores(context: GMWillingnessContext): GMWillingnessScore[] {
  return context.participants.map((participant) => {
    const score: GMWillingnessScore = {
      agentId: participant.agentId,
      score: 0,
      factors: [],
      reason: '',
      canSpeak: true,
    };

    // 直接提问/被要求回应属于最强信号，优先级应高于一般性格倾向。
    if (context.directlyAddressedAgentIds?.includes(participant.agentId)) {
      addFactor(score, 'direct_question', 40, 'The agent was directly addressed.');
    }
    if (context.requestedResponseAgentIds?.includes(participant.agentId)) {
      addFactor(score, 'requested_response', 35, 'The group expects an answer from this agent.');
    }
    if (context.challengedAgentIds?.includes(participant.agentId)) {
      addFactor(score, 'challenged', 30, 'The agent was challenged and has pressure to respond.');
    }
    if (context.mentionedAgentIds?.includes(participant.agentId)) {
      addFactor(score, 'mentioned', 30, 'The agent was mentioned by name.');
    }
    if (context.agentsWithNewInformation?.includes(participant.agentId)) {
      addFactor(score, 'new_information', 15, 'The agent recently gained relevant information.');
    }
    const relevantFacts = context.relevantFactIdsByAgent?.[participant.agentId]?.length ?? 0;
    if (relevantFacts > 0) {
      addFactor(score, 'relevant_information', Math.min(25, relevantFacts * 10), 'The agent knows facts relevant to the current topic.');
    }
    if (participant.plan && /answer|respond|explain|clarify/i.test(participant.plan)) {
      addFactor(score, 'goal_alignment', 20, 'The current plan suggests speaking up.');
    }
    const topicRelevance = context.topicRelevanceByAgent?.[participant.agentId] ?? 0;
    if (topicRelevance > 0) {
      addFactor(score, 'topic_relevance', Math.min(20, topicRelevance), 'The topic is especially relevant to this agent.');
    }
    const extroversion = participant.traits?.extroversion ?? 0;
    if (extroversion > 0) {
      addFactor(score, 'extroversion', 10 * extroversion, 'The agent is more willing to speak.');
    }
    const caution = participant.traits?.caution ?? 0;
    if (caution > 0) {
      addFactor(score, 'caution', -10 * caution, 'The agent is naturally more cautious.');
    }
    if (context.currentSpeakerId === participant.agentId) {
      addFactor(score, 'recently_spoke', -15, 'The agent was the most recent speaker.');
    }
    const emotionalPressure = context.emotionalPressureByAgent?.[participant.agentId] ?? 0;
    if (emotionalPressure > 0) {
      addFactor(score, 'emotional_pressure', Math.min(20, emotionalPressure), 'The agent is under emotional or task pressure to speak.');
    }
    if (context.heardByAgentIds && !context.heardByAgentIds.includes(participant.agentId)) {
      addFactor(score, 'not_present', -30, 'The agent did not hear the latest exchange.');
      // 听不到对话的人应默认不可选，而不是只靠低分兜底。
      score.canSpeak = false;
    }

    score.reason =
      score.factors.length > 0
        ? score.factors.map((factor) => `${factor.label}:${factor.delta}`).join(', ')
        : 'No strong speaking pressure.';
    return score;
  });
}
