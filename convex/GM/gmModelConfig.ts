/**
 * GM uses its own model configuration on purpose.
 * This keeps the Game Master sidecar decoupled from the main agent model setup.
 */
export const gmModelConfig = {
  provider: 'custom' as const,
  defaultModel: 'deepseek-v4-flash',
  apiUrlEnv: 'GM_API_URL',
  apiKeyEnv: 'GM_API_KEY',
  modelEnv: 'GM_MODEL',
};

export type GMModelConfig = typeof gmModelConfig;
