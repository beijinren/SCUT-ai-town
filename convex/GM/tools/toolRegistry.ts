import { GMToolKind } from '../gmTypes';

export interface GMToolDefinition {
  name: string;
  kind: GMToolKind;
  available?: boolean;
  aliases?: string[];
  description?: string;
}

export class GMToolRegistry {
  private definitions = new Map<string, GMToolDefinition>();

  register(definition: GMToolDefinition) {
    // Aliases let scene-specific verbs map onto stable canonical tool ids.
    this.definitions.set(definition.name, definition);
    for (const alias of definition.aliases ?? []) {
      this.definitions.set(alias, definition);
    }
    return definition;
  }

  get(name: string) {
    return this.definitions.get(name);
  }

  list() {
    return [...new Set(this.definitions.values())];
  }
}

const defaultRegistry = new GMToolRegistry();

defaultRegistry.register({
  name: 'send_email',
  kind: 'real_tool',
  available: false,
  description: 'Send an email through a real external integration.',
});
defaultRegistry.register({
  name: 'check_notice_board',
  kind: 'simulated_tool',
  available: true,
  aliases: ['read_notice_board'],
  description: 'Inspect a shared notice board in a simulated environment.',
});
defaultRegistry.register({
  name: 'sign_up',
  kind: 'simulated_tool',
  available: true,
  aliases: ['register_signup'],
  description: 'Register a name in a simulated sign-up flow.',
});
defaultRegistry.register({
  name: 'post_notice',
  kind: 'simulated_tool',
  available: true,
  aliases: ['publish_notice'],
  description: 'Post a notice to a simulated notice board.',
});
defaultRegistry.register({
  name: 'tidy_table',
  kind: 'narrative_only',
  available: true,
  aliases: ['organize_desk'],
  description: 'Narrative-only desk cleanup with no backing API.',
});

export function getToolDefinition(name: string) {
  return defaultRegistry.get(name);
}

export function listToolDefinitions() {
  return defaultRegistry.list();
}
