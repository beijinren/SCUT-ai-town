import { buildAssignmentKey, createEmptyAssignmentHistory, recordAssignment } from '../setup/assignmentHistory';
import { dealPersonas } from '../setup/personaAssigner';
import { loadPersonasFromValues } from '../setup/personaLoader';
import { scenarioConfigToStructuredScene } from '../setup/scenarioConfigAdapter';
import { extractIdentitySlotRefs } from '../setup/scenarioPersonaDealer';
import { IdentitySlotRef, PersonaTemplate } from '../setup/setupTypes';

const personas: PersonaTemplate[] = loadPersonasFromValues([
  { personaId: 'cautious_observer', name: 'Cautious', description: 'Observes before speaking.' },
  { personaId: 'rational_analyst', name: 'Analyst', description: 'Structures tradeoffs.' },
  { personaId: 'helpful_mediator', name: 'Mediator', description: 'Keeps people included.' },
]);

const identitySlots: IdentitySlotRef[] = [
  { identitySlotId: 'slot_0_lin_yuan', agentId: 'lin_yuan', displayName: 'Lin Yuan' },
  { identitySlotId: 'slot_1_meng_zhou', agentId: 'meng_zhou', displayName: 'Meng Zhou' },
];

describe('persona dealer', () => {
  it('extracts identity refs from legacy agents without reading goals', () => {
    const slots = extractIdentitySlotRefs({
      agents: [
        { first_name: 'Lin', last_name: 'Yuan', goal: 'Do not copy me.' },
        { first_name: 'Meng', last_name: 'Zhou', profile: { secret: 'Do not copy me.' } },
        { first_name: 'Qiao', last_name: 'Han' },
        { first_name: 'Wei', last_name: 'Chen' },
        { first_name: 'Bo', last_name: 'Li' },
        { first_name: 'Jing', last_name: 'An' },
        { first_name: 'Tao', last_name: 'Rui' },
      ],
    });

    expect(slots).toHaveLength(7);
    expect(slots[0]).toEqual({
      identitySlotId: 'slot_0_lin_yuan',
      agentId: 'lin_yuan',
      displayName: 'Lin Yuan',
    });
    expect(JSON.stringify(slots)).not.toContain('Do not copy me.');
  });

  it('extracts identity refs from identitySlots format', () => {
    const slots = extractIdentitySlotRefs({
      identitySlots: [{ slotId: 'organizer', agentId: 'meng_zhou', displayName: 'Meng Zhou' }],
    });

    expect(slots).toEqual([
      { identitySlotId: 'organizer', agentId: 'meng_zhou', displayName: 'Meng Zhou' },
    ]);
  });

  it('builds assignment keys independently from assignment order', () => {
    const left = buildAssignmentKey([
      { agentId: 'a', identitySlotId: 'slot_b', displayName: 'B', personaId: 'p2' },
      { agentId: 'b', identitySlotId: 'slot_a', displayName: 'A', personaId: 'p1' },
    ]);
    const right = buildAssignmentKey([
      { agentId: 'b', identitySlotId: 'slot_a', displayName: 'A', personaId: 'p1' },
      { agentId: 'a', identitySlotId: 'slot_b', displayName: 'B', personaId: 'p2' },
    ]);

    expect(left).toBe(right);
  });

  it('deals random-unused personas and skips a used assignment', () => {
    const first = dealPersonas({
      sceneId: 'scene_a',
      identitySlots,
      personas,
      history: createEmptyAssignmentHistory(),
      strategy: 'random-unused',
      seed: 1,
    });
    const history = recordAssignment(createEmptyAssignmentHistory(), first);
    const second = dealPersonas({
      sceneId: 'scene_a',
      identitySlots,
      personas,
      history,
      strategy: 'random-unused',
      seed: 1,
    });

    expect(second.assignmentKey).not.toBe(first.assignmentKey);
  });

  it('throws when personas are fewer than identity slots', () => {
    expect(() =>
      dealPersonas({
        sceneId: 'scene_a',
        identitySlots,
        personas: personas.slice(0, 1),
        history: createEmptyAssignmentHistory(),
        strategy: 'random-unused',
      }),
    ).toThrow('Persona count must be');
  });

  it('deals fixed personas and rejects repeated fixed assignments by default', () => {
    const fixedAssignments = {
      slot_0_lin_yuan: 'cautious_observer',
      slot_1_meng_zhou: 'rational_analyst',
    };
    const first = dealPersonas({
      sceneId: 'scene_a',
      identitySlots,
      personas,
      history: createEmptyAssignmentHistory(),
      strategy: 'fixed',
      fixedAssignments,
    });
    const history = recordAssignment(createEmptyAssignmentHistory(), first);

    expect(first.assignments.map((item) => item.personaId)).toEqual([
      'cautious_observer',
      'rational_analyst',
    ]);
    expect(() =>
      dealPersonas({
        sceneId: 'scene_a',
        identitySlots,
        personas,
        history,
        strategy: 'fixed',
        fixedAssignments,
      }),
    ).toThrow('Assignment has already been used');
  });

  it('allows repeated fixed assignments when allowRepeat is true', () => {
    const fixedAssignments = {
      slot_0_lin_yuan: 'cautious_observer',
      slot_1_meng_zhou: 'rational_analyst',
    };
    const first = dealPersonas({
      sceneId: 'scene_a',
      identitySlots,
      personas,
      history: createEmptyAssignmentHistory(),
      strategy: 'fixed',
      fixedAssignments,
    });
    const history = recordAssignment(createEmptyAssignmentHistory(), first);
    const repeated = dealPersonas({
      sceneId: 'scene_a',
      identitySlots,
      personas,
      history,
      strategy: 'fixed',
      fixedAssignments,
      allowRepeat: true,
    });

    expect(repeated.assignmentKey).toBe(first.assignmentKey);
  });

  it('does not produce goal or profile synthesis fields', () => {
    const result = dealPersonas({
      sceneId: 'scene_a',
      identitySlots,
      personas,
      history: createEmptyAssignmentHistory(),
      strategy: 'fixed',
      fixedAssignments: {
        slot_0_lin_yuan: 'cautious_observer',
        slot_1_meng_zhou: 'rational_analyst',
      },
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('agentGoal');
    expect(serialized).not.toContain('privateContext');
    expect(serialized).not.toContain('publicProfile');
    expect(serialized).not.toContain('initialKnowledge');
  });

  it('aligns persona assignments with scene agent role ids', () => {
    const scenarioConfig = {
      run_name: 'scene_a',
      scenario: 'Design one shared campus service prototype.',
      agents: [
        { first_name: 'Lin', last_name: 'Yuan', goal: 'Keep this goal in the scene.' },
        { first_name: 'Meng', last_name: 'Zhou', goal: 'Keep this goal in the scene.' },
      ],
    };
    const scene = scenarioConfigToStructuredScene(scenarioConfig);
    const slotsFromSameConfig = extractIdentitySlotRefs(scenarioConfig);
    const result = dealPersonas({
      sceneId: scene.id,
      identitySlots: slotsFromSameConfig,
      personas,
      history: createEmptyAssignmentHistory(),
      strategy: 'fixed',
      fixedAssignments: {
        slot_0_lin_yuan: 'cautious_observer',
        slot_1_meng_zhou: 'rational_analyst',
      },
    });

    expect(result.assignments.map((assignment) => assignment.identitySlotId)).toEqual(
      scene.roles.map((role) => role.id),
    );
  });
});
