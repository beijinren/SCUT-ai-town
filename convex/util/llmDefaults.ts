export const DEFAULT_CHAT_PROVIDER = 'custom' as const;
export const DEFAULT_CHAT_API_URL = 'https://api.deepseek.com';
export const DEFAULT_CHAT_MODEL = 'deepseek-v4-flash';
export const DEFAULT_CHAT_API_KEY_ENV = 'DEEPSEEK_API_KEY';

// All chat LLM calls are forced to DeepSeek's OpenAI-compatible flash model.
// Embeddings keep using the existing embedding configuration path.
