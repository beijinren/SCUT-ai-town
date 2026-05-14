import {
  AssignmentHistory,
  DealPersonasArgs,
  IdentitySlotRef,
  PersonaAssignment,
  PersonaDealResult,
  PersonaTemplate,
} from './setupTypes';
import { buildAssignmentKey, hasAssignmentBeenUsed } from './assignmentHistory';
import { createRunId } from './runId';

function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function personaMap(personas: PersonaTemplate[]) {
  return new Map(personas.map((persona) => [persona.personaId, persona]));
}

export function buildFixedAssignments(args: {
  identitySlots: IdentitySlotRef[];
  personas: PersonaTemplate[];
  fixedAssignments: Record<string, string>;
}): PersonaAssignment[] {
  const personasById = personaMap(args.personas);

  return args.identitySlots.map((slot) => {
    const personaId = args.fixedAssignments[slot.identitySlotId];
    if (!personaId) {
      throw new Error(`Missing fixed persona for identity slot ${slot.identitySlotId}.`);
    }
    if (!personasById.has(personaId)) {
      throw new Error(`Unknown personaId ${personaId} for identity slot ${slot.identitySlotId}.`);
    }
    return {
      agentId: slot.agentId,
      identitySlotId: slot.identitySlotId,
      displayName: slot.displayName,
      personaId,
    };
  });
}

export function buildRandomUnusedAssignments(args: {
  identitySlots: IdentitySlotRef[];
  personas: PersonaTemplate[];
  history: AssignmentHistory;
  sceneId: string;
  seed?: number;
  maxAttempts: number;
}): PersonaAssignment[] {
  if (args.personas.length < args.identitySlots.length) {
    throw new Error('Persona count must be >= identity slot count when repetition is disabled.');
  }

  const baseSeed = args.seed ?? Date.now();
  for (let attempt = 0; attempt < args.maxAttempts; attempt += 1) {
    // Each attempt gets a deterministic shuffle so experiments can be reproduced with a seed.
    const rng = createSeededRng(baseSeed + attempt);
    const shuffledPersonas = shuffle([...args.personas], rng).slice(0, args.identitySlots.length);
    const assignments = args.identitySlots.map((slot, index) => ({
      agentId: slot.agentId,
      identitySlotId: slot.identitySlotId,
      displayName: slot.displayName,
      personaId: shuffledPersonas[index].personaId,
    }));
    const assignmentKey = buildAssignmentKey(assignments);

    if (!hasAssignmentBeenUsed(args.history, args.sceneId, assignmentKey)) {
      return assignments;
    }
  }

  throw new Error(`No unused persona assignment found after ${args.maxAttempts} attempts.`);
}

export function dealPersonas(args: DealPersonasArgs): PersonaDealResult {
  const maxAttempts = args.maxAttempts ?? 100;
  const runId = createRunId(args.sceneId);
  const assignments =
    args.strategy === 'fixed'
      ? buildFixedAssignments({
          identitySlots: args.identitySlots,
          personas: args.personas,
          fixedAssignments: args.fixedAssignments ?? {},
        })
      : buildRandomUnusedAssignments({
          identitySlots: args.identitySlots,
          personas: args.personas,
          history: args.history,
          sceneId: args.sceneId,
          seed: args.seed,
          maxAttempts,
        });
  const assignmentKey = buildAssignmentKey(assignments);

  // Fixed assignments also pass through the same dedupe gate unless explicitly allowed.
  if (!args.allowRepeat && hasAssignmentBeenUsed(args.history, args.sceneId, assignmentKey)) {
    throw new Error(`Assignment has already been used for scene ${args.sceneId}.`);
  }

  return {
    runId,
    sceneId: args.sceneId,
    strategy: args.strategy,
    assignmentKey,
    assignments,
    createdAt: Date.now(),
  };
}
