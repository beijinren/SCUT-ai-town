import { IdentitySlotRef } from './setupTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toId(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'agent';
}

export function extractIdentitySlotRefs(config: unknown): IdentitySlotRef[] {
  if (!isRecord(config)) {
    throw new Error('Scenario config must be an object.');
  }

  // New scenario files can define identitySlots directly. We only copy IDs and names.
  if (Array.isArray(config.identitySlots)) {
    return config.identitySlots.map((slot, index) => {
      const slotRecord = isRecord(slot) ? slot : {};
      const fallbackId = `slot_${index}`;
      const identitySlotId = String(slotRecord.slotId ?? fallbackId);
      const agentId = String(slotRecord.agentId ?? slotRecord.slotId ?? `agent_${index}`);
      const displayName = String(slotRecord.displayName ?? slotRecord.identityName ?? `Agent ${index}`);

      return { identitySlotId, agentId, displayName };
    });
  }

  // Legacy scenario files already contain rich profile/goal fields.
  // The dealer intentionally ignores those fields and derives only stable refs.
  if (Array.isArray(config.agents)) {
    return config.agents.map((agent, index) => {
      const agentRecord = isRecord(agent) ? agent : {};
      const firstName = String(agentRecord.first_name ?? `Agent${index}`);
      const lastName = String(agentRecord.last_name ?? '');
      const displayName = `${firstName} ${lastName}`.trim();
      const stableAgentId = toId(displayName);

      return {
        identitySlotId: `slot_${index}_${stableAgentId}`,
        agentId: stableAgentId,
        displayName,
      };
    });
  }

  throw new Error('Scenario config must contain identitySlots or agents.');
}
