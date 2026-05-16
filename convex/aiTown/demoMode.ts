export const demoMode = {
  // 临时演示模式：先关闭 agent 间的自主社交，避免在未接 LLM 时持续报错。
  disableAgentConversations: false,
  disableAgentConversationMemory: false,
} as const;
