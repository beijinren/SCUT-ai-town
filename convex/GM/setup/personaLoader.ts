import { PersonaTemplate } from './setupTypes';

const DISALLOWED_PERSONA_FIELDS = new Set([
  'agentGoal',
  'goal',
  'sceneGoal',
  'identity',
  'identitySlotId',
  'willingness',
  'turnOrder',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validatePersonaTemplate(value: unknown): PersonaTemplate {
  if (!isRecord(value)) {
    throw new Error('Persona template must be an object.');
  }

  // Personas describe style only. Goals, identities, and turn logic live elsewhere.
  for (const field of DISALLOWED_PERSONA_FIELDS) {
    if (field in value) {
      throw new Error(`Persona template must not contain ${field}.`);
    }
  }

  if (typeof value.personaId !== 'string' || value.personaId.length === 0) {
    throw new Error('Persona template needs a non-empty personaId.');
  }
  if (typeof value.name !== 'string' || value.name.length === 0) {
    throw new Error(`Persona ${value.personaId} needs a non-empty name.`);
  }
  if (typeof value.description !== 'string' || value.description.length === 0) {
    throw new Error(`Persona ${value.personaId} needs a non-empty description.`);
  }

  return value as PersonaTemplate;
}

export function validatePersonaTemplates(values: unknown[]): PersonaTemplate[] {
  const personas = values.map(validatePersonaTemplate);
  const seen = new Set<string>();
  for (const persona of personas) {
    if (seen.has(persona.personaId)) {
      throw new Error(`Duplicate personaId: ${persona.personaId}`);
    }
    seen.add(persona.personaId);
  }
  return personas;
}

export function loadPersonasFromValues(values: unknown[]): PersonaTemplate[] {
  return validatePersonaTemplates(values);
}
