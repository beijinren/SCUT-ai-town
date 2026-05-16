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

export async function generateTurnThought(
  ctx: ActionCtx,
  args: {
    agentName: string;
    participantNames: string[];
    identity: string;
    plan: string;
    isSpeaker: boolean;
    semanticContext?: string;
    recentMessages?: string;
  },
): Promise<string | null> {
  try {
    const thoughtPrompt: LLMMessage[] = [
      {
        role: "system",
        content: [
          `You are ${args.agentName}. Write a private internal thought for this conversation turn.`,
          `Participants: ${args.participantNames.join(", ") || "unknown"}.`,
          `Your identity: ${args.identity}`,
          `Your goal: ${args.plan}`,
          args.semanticContext ? `Current semantic environment: ${args.semanticContext}` : "",
          args.recentMessages ? `Recent visible conversation: ${args.recentMessages}` : "",
          args.isSpeaker
            ? "You are about to speak. Think about what to say next."
            : "You are not speaking this turn. Think privately about what you noticed and what you may do later.",
          "Do not reveal hidden private information in this thought unless it belongs to you. Keep it concise, 2-4 sentences.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ];

    const { content } = await chatCompletion(ctx, {
      messages: thoughtPrompt,
      max_tokens: THOUGHT_MAX_TOKENS,
      temperature: THOUGHT_TEMPERATURE,
    });

    return content.trim();
  } catch (error) {
    console.warn("Failed to generate turn thought:", error);
    return null;
  }
}
