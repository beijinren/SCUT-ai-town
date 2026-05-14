import { buildSceneProtocol } from '../../aiTown/sceneProtocol';
import { scenarioConfigToStructuredScene } from '../setup/scenarioConfigAdapter';
import { extractIdentitySlotRefs } from '../setup/scenarioPersonaDealer';

const legacyScenarioConfig = {
  run_name: 'cross_major_creative_workshop_ai_town',
  scenario: 'Students from different majors need to design a campus service prototype.',
  location: 'AI-town Innovation Center',
  action_affordances: ['speak', 'ask_question', 'take_notes'],
  time_label: 'workshop_opening',
  agents: [
    {
      first_name: 'Lin',
      last_name: 'Yuan',
      profile: {
        occupation: 'Computer science student',
        public_info: 'Quiet student who likes concrete prototypes.',
        secret: 'She has already made a small demo but is nervous to mention it.',
      },
      goal: 'Contribute one concrete product idea.',
    },
    {
      first_name: 'Meng',
      last_name: 'Zhou',
      profile: {
        occupation: 'Workshop organizer',
        public_info: 'Responsible for keeping the team on task.',
      },
      goal: 'Help the team reach a shared prototype direction.',
    },
  ],
};

describe('scenario config adapter', () => {
  it('converts legacy scenario_config agents into StructuredScene roles', () => {
    const scene = scenarioConfigToStructuredScene(legacyScenarioConfig);

    expect(scene.id).toBe('cross_major_creative_workshop_ai_town');
    expect(scene.roles).toHaveLength(2);
    expect(scene.roles[0].id).toBe('slot_0_lin_yuan');
    expect(scene.roles[1].id).toBe('slot_1_meng_zhou');
    expect(scene.publicSummary).toContain('campus service prototype');
    expect(scene.phaseRules[0].allowedPermissions).toEqual([
      'speak',
      'ask_question',
      'take_notes',
    ]);
  });

  it('keeps private secrets in private facts instead of public scene summary', () => {
    const scene = scenarioConfigToStructuredScene(legacyScenarioConfig);
    const serializedPublic = JSON.stringify({
      publicSummary: scene.publicSummary,
      firstIdentity: scene.roles[0].identity,
    });

    expect(serializedPublic).not.toContain('small demo');
    expect(scene.facts.some((fact) => fact.id === 'fact_private_slot_0_lin_yuan_secret')).toBe(true);
  });

  it('uses the same identitySlotId as the persona dealer', () => {
    const scene = scenarioConfigToStructuredScene(legacyScenarioConfig);
    const identitySlots = extractIdentitySlotRefs(legacyScenarioConfig);

    expect(scene.roles.map((role) => role.id)).toEqual(
      identitySlots.map((slot) => slot.identitySlotId),
    );
  });

  it('produces agent seeds whose roleId can match persona assignments', () => {
    const scene = scenarioConfigToStructuredScene(legacyScenarioConfig);
    const protocol = buildSceneProtocol(scene);
    const identitySlots = extractIdentitySlotRefs(legacyScenarioConfig);

    expect(protocol.agentSeeds.map((seed) => seed.roleId)).toEqual(
      identitySlots.map((slot) => slot.identitySlotId),
    );
  });
});
