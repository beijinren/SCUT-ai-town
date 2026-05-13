import { ActionCtx } from "../_generated/server";
import { GameId } from "../aiTown/ids";
import { Id } from "../_generated/dataModel";
import { LLMMessage, chatCompletion } from "../util/llm";
import * as memory from "./memory";
import * as embeddingsCache from "./embeddingsCache";
import { getThoughtConfig, type ThoughtLevel } from "./thoughtConfig";

/**
 * 生成角色思考内容
 */
export async function generateThought(
  ctx: ActionCtx,
  worldId: Id<"worlds">,
  playerId: GameId<"players">,
  otherPlayerId: GameId<"players">,
  thoughtLevel: ThoughtLevel,
  playerName: string,
  otherPlayerName: string,
  playerIdentity: string,
): Promise<string | null> {
  const config = getThoughtConfig(thoughtLevel);

  // 如果不需要思考，直接返回 null
  if (config.memoryLayers === 0) {
    return null;
  }

  try {
    // 从 thought topic 获取嵌入向量
    const embedding = await embeddingsCache.fetch(
      ctx,
      `${playerName} is about to talk with ${otherPlayerName}`,
    );

    // 根据配置层数获取不同数量的记忆
    const memories = await memory.searchMemories(
      ctx,
      playerId,
      embedding,
      config.memoryLayers,
    );

    // 构建思考提示词
    const memoryContext = memories
      .map((m) => {
        if (m.data.type === "conversation") {
          return `与${otherPlayerName}的对话：${m.description}`;
        } else if (m.data.type === "relationship") {
          return `关于${otherPlayerName}的了解：${m.description}`;
        } else if (m.data.type === "reflection") {
          return `反思：${m.description}`;
        }
        return m.description;
      })
      .join("\n- ");

    const thoughtPrompt: LLMMessage[] = [
      {
        role: "system",
        content: `你是${playerName}。你即将与${otherPlayerName}进行对话。请先进行一个简短的思考，思考你对这次对话的想法、策略或可能的话题。

个性特征：${playerIdentity}

相关记忆：
- ${memoryContext || "暂无相关记忆"}

请用 3-5 句话进行思考，保持内心独白的风格。`,
      },
    ];

    const { content } = await chatCompletion(ctx, {
      messages: thoughtPrompt,
      max_tokens: config.maxThoughtTokens,
      temperature: config.temperature,
    });

    return content.trim();
  } catch (error) {
    console.warn("Failed to generate thought:", error);
    return null;
  }
}
