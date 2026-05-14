import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { ActionCtx, internalQuery } from "../_generated/server";
import { LLMMessage, chatCompletion } from "../util/llm";
import { api, internal } from "../_generated/api";
import { GameId, conversationId, playerId } from "../aiTown/ids";

const selfInternal = internal.agent.conversation;

export async function startConversationMessage(
  ctx: ActionCtx,
  worldId: Id<"worlds">,
  conversationId: GameId<"conversations">,
  playerId: GameId<"players">,
  otherPlayerId: GameId<"players">,
  thought?: string,
): Promise<string> {
  const {
    player,
    otherPlayers,
    agent,
    otherAgents,
  } = await ctx.runQuery(selfInternal.queryPromptData, {
    worldId,
    playerId,
    otherPlayerId,
    conversationId,
  });
  const prompt = [
    `You are ${player.name}, and you just started speaking in a conversation with ${participantNames(otherPlayers)}.`,
  ];
  prompt.push(...agentPrompts(otherPlayers, agent, otherAgents));
  if (thought) {
    prompt.push(
      `Before responding, keep this internal thought in mind: ${thought}`,
    );
  }
  const lastPrompt = `${player.name}:`;
  prompt.push(lastPrompt);

  const { content } = await chatCompletion(ctx, {
    messages: [
      {
        role: "system",
        content: prompt.join("\n"),
      },
    ],
    max_tokens: 300,
    stop: stopWords(
      otherPlayers.map((participant) => participant.name),
      player.name,
    ),
  });
  return trimContentPrefx(content, lastPrompt);
}

function trimContentPrefx(content: string, prompt: string) {
  if (content.startsWith(prompt)) {
    return content.slice(prompt.length).trim();
  }
  return content;
}

export async function continueConversationMessage(
  ctx: ActionCtx,
  worldId: Id<"worlds">,
  conversationId: GameId<"conversations">,
  playerId: GameId<"players">,
  otherPlayerId: GameId<"players">,
  thought?: string,
): Promise<string> {
  const {
    player,
    otherPlayers,
    conversation,
    agent,
    otherAgents,
  } = await ctx.runQuery(selfInternal.queryPromptData, {
    worldId,
    playerId,
    otherPlayerId,
    conversationId,
  });
  const now = Date.now();
  const started = new Date(conversation.created);
  const prompt = [
    `You are ${player.name}, and you're currently in a conversation with ${participantNames(otherPlayers)}.`,
    `The conversation started at ${started.toLocaleString()}. It's now ${now.toLocaleString()}.`,
  ];
  prompt.push(...agentPrompts(otherPlayers, agent, otherAgents));
  if (thought) {
    prompt.push(
      `Before responding, keep this internal thought in mind: ${thought}`,
    );
  }
  prompt.push(
    `Below is the current chat history in this group conversation.`,
    `DO NOT greet them again. Do NOT use the word "Hey" too often. Your response should be brief and within 200 characters.`,
  );

  const llmMessages: LLMMessage[] = [
    {
      role: "system",
      content: prompt.join("\n"),
    },
    ...(await previousMessages(
      ctx,
      worldId,
      player,
      conversation.id as GameId<"conversations">,
    )),
  ];
  const lastPrompt = `${player.name}:`;
  llmMessages.push({ role: "user", content: lastPrompt });

  const { content } = await chatCompletion(ctx, {
    messages: llmMessages,
    max_tokens: 300,
    stop: stopWords(
      otherPlayers.map((participant) => participant.name),
      player.name,
    ),
  });
  return trimContentPrefx(content, lastPrompt);
}

export async function leaveConversationMessage(
  ctx: ActionCtx,
  worldId: Id<"worlds">,
  conversationId: GameId<"conversations">,
  playerId: GameId<"players">,
  otherPlayerId: GameId<"players">,
  thought?: string,
): Promise<string> {
  const { player, otherPlayers, conversation, agent, otherAgents } =
    await ctx.runQuery(selfInternal.queryPromptData, {
      worldId,
      playerId,
      otherPlayerId,
      conversationId,
    });
  const prompt = [
    `You are ${player.name}, and you're currently in a conversation with ${participantNames(otherPlayers)}.`,
    `You've decided to leave the conversation and would like to politely tell the group that you're leaving.`,
  ];
  prompt.push(...agentPrompts(otherPlayers, agent, otherAgents));
  if (thought) {
    prompt.push(
      `Before responding, keep this internal thought in mind: ${thought}`,
    );
  }
  prompt.push(
    `Below is the current chat history in this group conversation.`,
    `How would you like to tell them that you're leaving? Your response should be brief and within 200 characters.`,
  );
  const llmMessages: LLMMessage[] = [
    {
      role: "system",
      content: prompt.join("\n"),
    },
    ...(await previousMessages(
      ctx,
      worldId,
      player,
      conversation.id as GameId<"conversations">,
    )),
  ];
  const lastPrompt = `${player.name}:`;
  llmMessages.push({ role: "user", content: lastPrompt });

  const { content } = await chatCompletion(ctx, {
    messages: llmMessages,
    max_tokens: 300,
    stop: stopWords(
      otherPlayers.map((participant) => participant.name),
      player.name,
    ),
  });
  return trimContentPrefx(content, lastPrompt);
}

function participantNames(participants: Array<{ name: string }>) {
  if (participants.length === 0) {
    return "no one else";
  }
  return participants.map((participant) => participant.name).join(", ");
}

function agentPrompts(
  otherPlayers: Array<{ name: string }>,
  agent: { identity: string; plan: string } | null,
  otherAgents: Array<{ name: string; publicProfile: string }>,
): string[] {
  const prompt = [];
  if (agent) {
    prompt.push(`About you: ${agent.identity}`);
    prompt.push(`Your goals for the conversation: ${agent.plan}`);
  }
  for (const otherAgent of otherAgents) {
    prompt.push(`About ${otherAgent.name}: ${otherAgent.publicProfile}`);
  }
  for (const otherPlayer of otherPlayers) {
    if (
      !otherAgents.find((otherAgent) => otherAgent.name === otherPlayer.name)
    ) {
      prompt.push(
        `About ${otherPlayer.name}: another participant in the same conversation.`,
      );
    }
  }
  return prompt;
}

async function previousMessages(
  ctx: ActionCtx,
  worldId: Id<"worlds">,
  player: { id: string; name: string },
  conversationId: GameId<"conversations">,
) {
  const llmMessages: LLMMessage[] = [];
  const prevMessages = await ctx.runQuery(api.messages.listMessages, {
    worldId,
    conversationId,
  });
  for (const message of prevMessages) {
    llmMessages.push({
      role: "user",
      content: `${message.authorName}: ${message.text}`,
    });
  }
  return llmMessages;
}

export const queryPromptData = internalQuery({
  args: {
    worldId: v.id("worlds"),
    playerId,
    otherPlayerId: playerId,
    conversationId,
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.get(args.worldId);
    if (!world) {
      throw new Error(`World ${args.worldId} not found`);
    }
    const player = world.players.find((p) => p.id === args.playerId);
    if (!player) {
      throw new Error(`Player ${args.playerId} not found`);
    }
    const playerDescription = await ctx.db
      .query("playerDescriptions")
      .withIndex("worldId", (q) =>
        q.eq("worldId", args.worldId).eq("playerId", args.playerId),
      )
      .first();
    if (!playerDescription) {
      throw new Error(`Player description for ${args.playerId} not found`);
    }
    const otherPlayer = world.players.find((p) => p.id === args.otherPlayerId);
    if (!otherPlayer) {
      throw new Error(`Player ${args.otherPlayerId} not found`);
    }
    const otherPlayerDescription = await ctx.db
      .query("playerDescriptions")
      .withIndex("worldId", (q) =>
        q.eq("worldId", args.worldId).eq("playerId", args.otherPlayerId),
      )
      .first();
    if (!otherPlayerDescription) {
      throw new Error(`Player description for ${args.otherPlayerId} not found`);
    }
    const conversation = world.conversations.find(
      (c) => c.id === args.conversationId,
    );
    if (!conversation) {
      throw new Error(`Conversation ${args.conversationId} not found`);
    }
    const agent = world.agents.find((a) => a.playerId === args.playerId);
    if (!agent) {
      throw new Error(`Player ${args.playerId} not found`);
    }
    const agentDescription = await ctx.db
      .query("agentDescriptions")
      .withIndex("worldId", (q) =>
        q.eq("worldId", args.worldId).eq("agentId", agent.id),
      )
      .first();
    if (!agentDescription) {
      throw new Error(`Agent description for ${agent.id} not found`);
    }
    const participantIds = conversation.participants.map(
      (participant) => participant.playerId,
    );
    const otherPlayers = [];
    const nameById = new Map<string, string>([
      [args.otherPlayerId, otherPlayerDescription.name],
    ]);
    for (const participantId of participantIds) {
      if (participantId === args.playerId) {
        continue;
      }
      const participant = world.players.find((p) => p.id === participantId);
      if (!participant) {
        continue;
      }
      let participantName = nameById.get(participantId);
      if (!participantName) {
        const participantDescription = await ctx.db
          .query("playerDescriptions")
          .withIndex("worldId", (q) =>
            q.eq("worldId", args.worldId).eq("playerId", participantId),
          )
          .first();
        if (!participantDescription) {
          throw new Error(`Player description for ${participantId} not found`);
        }
        participantName = participantDescription.name;
        nameById.set(participantId, participantName);
      }
      otherPlayers.push({ name: participantName, ...participant });
    }
    const otherAgents: Array<{ name: string; publicProfile: string }> = [];
    for (const participant of otherPlayers) {
      const agentRecord = world.agents.find(
        (a) => a.playerId === participant.id,
      );
      if (!agentRecord) {
        continue;
      }
      const description = await ctx.db
        .query("agentDescriptions")
        .withIndex("worldId", (q) =>
          q.eq("worldId", args.worldId).eq("agentId", agentRecord.id),
        )
        .first();
      if (!description) {
        throw new Error(`Agent description for ${agentRecord.id} not found`);
      }
      otherAgents.push({
        publicProfile: description.publicProfile,
        name: participant.name,
      });
    }
    return {
      player: { name: playerDescription.name, ...player },
      otherPlayer: { name: otherPlayerDescription.name, ...otherPlayer },
      otherPlayers,
      conversation,
      agent: {
        identity: agentDescription.identity,
        plan: agentDescription.plan,
        ...agent,
      },
      otherAgents,
    };
  },
});

function stopWords(otherPlayers: string[], player: string) {
  // These are the words we ask the LLM to stop on. OpenAI only supports 4.
  const variants = otherPlayers.map(
    (otherPlayer) => `${otherPlayer} to ${player}`,
  );
  return variants.flatMap((stop) => [stop + ":", stop.toLowerCase() + ":"]);
}
