import { GMWillingnessContext, GMWillingnessTriggerReason } from '../gmTypes';

export function shouldRecomputeWillingness(context: GMWillingnessContext): GMWillingnessTriggerReason | null {
  // 只在关键变化点重算，避免 GM 每一句都强行介入轮次。
  if (context.isFirstRound || !context.latestMessage) {
    return 'first_round';
  }
  if (context.newParticipantJoined) {
    return 'new_participant_joined';
  }
  if ((context.directlyAddressedAgentIds?.length ?? 0) > 0) {
    return 'direct_question';
  }
  if ((context.requestedResponseAgentIds?.length ?? 0) > 0 || (context.challengedAgentIds?.length ?? 0) > 0) {
    return 'challenged_or_requested';
  }
  if ((context.mentionedAgentIds?.length ?? 0) > 0) {
    return 'agent_mentioned';
  }
  if ((context.agentsWithNewInformation?.length ?? 0) > 0) {
    return 'new_information';
  }
  if (context.scenePhaseChanged) {
    return 'scene_phase_changed';
  }
  if (context.topicChanged) {
    return 'topic_changed';
  }
  return null;
}
