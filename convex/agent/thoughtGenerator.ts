import { ActionCtx } from "../_generated/server";
import { GameId } from "../aiTown/ids";
import { Id } from "../_generated/dataModel";
import { LLMMessage, chatCompletion } from "../util/llm";

const THOUGHT_MAX_TOKENS = 150;
const THOUGHT_TEMPERATURE = 0.3;

/**
 * 生成角色思考内容
 */
export async function generateThought(
  ctx: ActionCtx,
  worldId: Id<"worlds">,
  playerId: GameId<"players">,
  otherPlayerId: GameId<"players">,
  playerName: string,
  otherPlayerName: string,
  playerIdentity: string,
): Promise<string | null> {
  try {
    const thoughtPrompt: LLMMessage[] = [
      {
        role: "system",
        content: `你是${playerName}。你即将与${otherPlayerName}进行对话。请先进行一个简短的思考，思考你对这次对话的想法、策略或可能的话题。

个性特征：${playerIdentity}

请用 3-5 句话进行思考，保持内心独白的风格。`,
      },
    ];

    const { content } = await chatCompletion(ctx, {
      messages: thoughtPrompt,
      max_tokens: THOUGHT_MAX_TOKENS,
      temperature: THOUGHT_TEMPERATURE,
    });

    return content.trim();
  } catch (error) {
    console.warn("Failed to generate thought:", error);
    return null;
  }
}
