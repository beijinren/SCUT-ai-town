import { recordGuardDebug, recordWillingnessDebug } from '../debug/debugLog';
import { buildObservation } from '../perception/observationBuilder';
import { buildPerceptionsForConversation } from '../perception/perception';
import { judgeOutput } from '../guard/knowledgeGuard';
import { decideIntervention } from '../intervention/intervention';
import { buildRollbackPlan } from '../intervention/rollbackPlan';
import { buildRegenerationPrompt } from '../intervention/regenerate';
import { normalizeGMContext } from './gmContextLoader';
import { runGMPipeline } from './gmPipeline';
import {
  GMGuardContext,
  GMRuntimeContext,
  GMWillingnessContext,
} from '../gmTypes';
import { calculateWillingnessScores } from '../willingness/willingnessCalculator';
import { resolveTurnOrder } from '../willingness/turnOrderResolver';
import { shouldRecomputeWillingness } from '../willingness/willingnessTrigger';
import { buildWillingnessDebugRecord } from '../willingness/willingnessDebug';
import { handleSimulatedToolAction } from '../tools/simulatedToolHandler';

export class GMRuntime {
  constructor(private readonly baseContext: GMRuntimeContext) {}

  private context() {
    return normalizeGMContext(this.baseContext);
  }

  buildAgentObservation(agentId: string) {
    return buildObservation(this.context(), agentId);
  }

  buildConversationObservations(participantAgentIds: string[]) {
    return buildPerceptionsForConversation(this.context(), participantAgentIds);
  }

  checkAgentMessage(agentId: string, output: string, conversationId?: string) {
    const context = this.context();
    const actor = context.actors.find((item) => item.agentId === agentId);
    if (!actor) {
      throw new Error(`Unknown agent ${agentId}`);
    }
    const observation = buildObservation(context, agentId);
    const guardContext: GMGuardContext = {
      worldId: context.worldId,
      actor,
      semanticLocation: observation.semanticLocation,
      visibleFacts: observation.visibleFacts,
      knownFacts: context.facts.filter(
        (fact) =>
          (fact.knownBy ?? []).includes(agentId) ||
          (fact.ownerAgentIds ?? []).includes(agentId) ||
          (fact.sharedWithAgentIds ?? []).includes(agentId) ||
          fact.visibility === 'public',
      ),
      allFacts: context.facts,
      recentMessages: observation.audibleMessages,
      physicallyPresentAgentIds: observation.visibleAgents,
      audibleAgentIds: observation.audibleMessages
        .map((message) => message.authorAgentId)
        .filter((authorId): authorId is string => Boolean(authorId)),
    };
    const result = judgeOutput(agentId, output, guardContext);
    const intervention = decideIntervention(result);
    const rollback = buildRollbackPlan(result);
    /*
     * Prepare a regeneration prompt for leakage outcomes.
     * Level 1 uses it automatically; Level 3 keeps it for debug review.
     */
    const shouldPrepareRegenerationPrompt =
      result.decision === 'possible_leakage' || result.decision === 'clear_leakage';
    const regenerationPrompt =
      shouldPrepareRegenerationPrompt
        ? buildRegenerationPrompt(agentId, output, result, observation)
        : undefined;
    /* Keep GM audit logs separate from messages and memory. */
    const debugRecord = recordGuardDebug({
      type: 'guard',
      timestamp: Date.now(),
      agentId,
      conversationId,
      rawOutput: output,
      visibleFacts: observation.visibleFacts.map((fact) => fact.factId),
      hiddenFactsMatched: result.matchedFactIds,
      reasoningType: result.reasoningType,
      interventionLevel: result.interventionLevel,
      decision: result.decision,
      result,
    });
    return { result, intervention, rollback, regenerationPrompt, debugRecord };
  }

  checkActionIntent(actionIntent: string) {
    return handleSimulatedToolAction(actionIntent);
  }

  resolveTurnOrder(context: GMWillingnessContext) {
    const trigger = shouldRecomputeWillingness(context) ?? 'manual_refresh';
    const scores = calculateWillingnessScores(context);
    const result = resolveTurnOrder(scores, trigger);
    recordWillingnessDebug(buildWillingnessDebugRecord(context.conversationId, trigger, result));
    return result;
  }

  recordGMEvent() {
    return runGMPipeline(this.context());
  }
}
