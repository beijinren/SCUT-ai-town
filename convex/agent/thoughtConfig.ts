/**
 * 角色思考等级配置
 */

export const THOUGHT_LEVELS = {
  /** 直觉：不思考，直接回应 */
  INTUITION: 'intuition',
  /** 思考：短暂思考后回应 */
  THINK: 'think',
  /** 长考：进行严谨的深思后再作答 */
  DEEP_THINK: 'deep_think',
} as const;

export type ThoughtLevel = typeof THOUGHT_LEVELS[keyof typeof THOUGHT_LEVELS];

export interface ThoughtLevelConfig {
  level: ThoughtLevel;
  /** 使用多少层记忆作为思考上下文（0 = 不思考） */
  memoryLayers: number;
  /** 思考的 token 限制 */
  maxThoughtTokens: number;
  /** 思考的 temperature（越低越理性） */
  temperature: number;
}

/**
 * 思考等级与记忆层数的映射配置
 */
export const THOUGHT_CONFIG: Record<ThoughtLevel, ThoughtLevelConfig> = {
  [THOUGHT_LEVELS.INTUITION]: {
    level: THOUGHT_LEVELS.INTUITION,
    memoryLayers: 0,
    maxThoughtTokens: 0,
    temperature: 0.7,
  },
  [THOUGHT_LEVELS.THINK]: {
    level: THOUGHT_LEVELS.THINK,
    memoryLayers: 3,
    maxThoughtTokens: 150,
    temperature: 0.3,
  },
  [THOUGHT_LEVELS.DEEP_THINK]: {
    level: THOUGHT_LEVELS.DEEP_THINK,
    memoryLayers: 8,
    maxThoughtTokens: 400,
    temperature: 0.1,
  },
};

/**
 * 从等级获取配置
 */
export function getThoughtConfig(level: ThoughtLevel): ThoughtLevelConfig {
  return THOUGHT_CONFIG[level] || THOUGHT_CONFIG[THOUGHT_LEVELS.INTUITION];
}
