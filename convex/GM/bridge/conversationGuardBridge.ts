import { GMRuntimeContext } from '../gmTypes';
import { GMRuntime } from '../runtime/gmRuntime';

export function guardGeneratedMessage(args: {
  runtimeContext: GMRuntimeContext;
  agentId: string;
  conversationId?: string;
  rawOutput: string;
}) {
  /*
   * Keep this bridge thin:
   * adapt generated text into GM signals without embedding policy here.
   */
  const runtime = new GMRuntime(args.runtimeContext);
  const { result, intervention, rollback, regenerationPrompt, debugRecord } =
    runtime.checkAgentMessage(args.agentId, args.rawOutput, args.conversationId);

  return {
    shouldWrite: rollback.shouldWriteMessage,
    shouldRegenerate: intervention.action === 'regenerate',
    finalOutput: args.rawOutput,
    debugRecord,
    rollbackPlan: rollback,
    regenerationPrompt,
    result,
  };
}
