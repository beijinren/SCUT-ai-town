import { GMToolOutcome } from './toolOutcome';
import { getToolDefinition } from './toolRegistry';

export interface GMSimulatedToolActionIntent {
  action: string;
  actorId?: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
}

export function handleSimulatedToolAction(
  actionIntent: string | GMSimulatedToolActionIntent,
): GMToolOutcome {
  const normalized = typeof actionIntent === 'string' ? { action: actionIntent } : actionIntent;
  const definition = getToolDefinition(normalized.action);
  if (!definition) {
    return { kind: 'failed', action: normalized.action, detail: 'Unknown tool action.' };
  }
  if (definition.kind === 'real_tool' && !definition.available) {
    return {
      kind: 'unavailable',
      action: normalized.action,
      detail: 'Real tool is not available.',
      metadata: normalized.payload,
    };
  }
  if (definition.kind === 'narrative_only') {
    return {
      kind: 'recorded_only',
      action: normalized.action,
      detail: 'Action recorded as narrative-only.',
      metadata: normalized.payload,
    };
  }
  return {
    kind: 'success',
    action: normalized.action,
    detail: 'Simulated tool action completed.',
    metadata: normalized.payload,
  };
}
