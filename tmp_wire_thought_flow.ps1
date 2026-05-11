$root = 'd:\Codes\SRP\SCUT-ai-townv0.1\SCUT-ai-town'

# Update conversation prompt builders to accept internal thought.
$conversationPath = Join-Path $root 'convex\agent\conversation.ts'
$conversation = Get-Content $conversationPath -Raw
$conversation = $conversation.Replace("export async function startConversationMessage(`r`n  ctx: ActionCtx,`r`n  worldId: Id<'worlds'>,`r`n  conversationId: GameId<'conversations'>,`r`n  playerId: GameId<'players'>,`r`n  otherPlayerId: GameId<'players'>,`r`n): Promise<string> {", "export async function startConversationMessage(`r`n  ctx: ActionCtx,`r`n  worldId: Id<'worlds'>,`r`n  conversationId: GameId<'conversations'>,`r`n  playerId: GameId<'players'>,`r`n  otherPlayerId: GameId<'players'>,`r`n  thought?: string,`r`n): Promise<string> {")
$conversation = $conversation.Replace("  if (memoryWithOtherPlayer) {`r`n    prompt.push(`r`n      `Be sure to include some detail or question about a previous conversation in your greeting.`,`r`n    );`r`n  }`r`n  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;", "  if (memoryWithOtherPlayer) {`r`n    prompt.push(`r`n      `Be sure to include some detail or question about a previous conversation in your greeting.`,`r`n    );`r`n  }`r`n  if (thought) {`r`n    prompt.push(`Before responding, keep this internal thought in mind: ${thought}`);`r`n  }`r`n  const lastPrompt = `${player.name} to ${otherPlayer.name}:`;")
$conversation = $conversation.Replace("export async function continueConversationMessage(`r`n  ctx: ActionCtx,`r`n  worldId: Id<'worlds'>,`r`n  conversationId: GameId<'conversations'>,`r`n  playerId: GameId<'players'>,`r`n  otherPlayerId: GameId<'players'>,`r`n): Promise<string> {", "export async function continueConversationMessage(`r`n  ctx: ActionCtx,`r`n  worldId: Id<'worlds'>,`r`n  conversationId: GameId<'conversations'>,`r`n  playerId: GameId<'players'>,`r`n  otherPlayerId: GameId<'players'>,`r`n  thought?: string,`r`n): Promise<string> {")
$conversation = $conversation.Replace("  prompt.push(...relatedMemoriesPrompt(memories));`r`n  prompt.push(`r`n    `Below is the current chat history between you and ${otherPlayer.name}.`,`r`n    `DO NOT greet them again. Do NOT use the word \"Hey\" too often. Your response should be brief and within 200 characters.`,`r`n  );", "  prompt.push(...relatedMemoriesPrompt(memories));`r`n  if (thought) {`r`n    prompt.push(`Before responding, keep this internal thought in mind: ${thought}`);`r`n  }`r`n  prompt.push(`r`n    `Below is the current chat history between you and ${otherPlayer.name}.`,`r`n    `DO NOT greet them again. Do NOT use the word \"Hey\" too often. Your response should be brief and within 200 characters.`,`r`n  );")
$conversation = $conversation.Replace("export async function leaveConversationMessage(`r`n  ctx: ActionCtx,`r`n  worldId: Id<'worlds'>,`r`n  conversationId: GameId<'conversations'>,`r`n  playerId: GameId<'players'>,`r`n  otherPlayerId: GameId<'players'>,`r`n): Promise<string> {", "export async function leaveConversationMessage(`r`n  ctx: ActionCtx,`r`n  worldId: Id<'worlds'>,`r`n  conversationId: GameId<'conversations'>,`r`n  playerId: GameId<'players'>,`r`n  otherPlayerId: GameId<'players'>,`r`n  thought?: string,`r`n): Promise<string> {")
$conversation = $conversation.Replace("  prompt.push(...agentPrompts(otherPlayer, agent, otherAgent ?? null));`r`n  prompt.push(`r`n    `Below is the current chat history between you and ${otherPlayer.name}.`,`r`n    `How would you like to tell them that you're leaving? Your response should be brief and within 200 characters.`,`r`n  );", "  prompt.push(...agentPrompts(otherPlayer, agent, otherAgent ?? null));`r`n  if (thought) {`r`n    prompt.push(`Before responding, keep this internal thought in mind: ${thought}`);`r`n  }`r`n  prompt.push(`r`n    `Below is the current chat history between you and ${otherPlayer.name}.`,`r`n    `How would you like to tell them that you're leaving? Your response should be brief and within 200 characters.`,`r`n  );")
Set-Content -Encoding UTF8 $conversationPath $conversation

# Update agentGenerateMessage to generate and persist thought before the response.
$agentOpsPath = Join-Path $root 'convex\aiTown\agentOperations.ts'
$agentOps = Get-Content $agentOpsPath -Raw
$agentOps = $agentOps.Replace("import { decideInteractionTiming } from './interactionTiming';`r`nimport { generateThought } from '../agent/thoughtGenerator';`r`nimport { getThoughtConfig, THOUGHT_LEVELS } from '../agent/thoughtConfig';`r`nimport { fetchEmbedding } from '../util/llm';", "import { decideInteractionTiming } from './interactionTiming';`r`nimport { generateThought } from '../agent/thoughtGenerator';`r`nimport { getThoughtConfig, THOUGHT_LEVELS } from '../agent/thoughtConfig';`r`nimport { fetchEmbedding } from '../util/llm';")
$oldBlock = @"
    let completionFn;
    switch (args.type) {
      case 'start':
        completionFn = startConversationMessage;
        break;
      case 'continue':
        completionFn = continueConversationMessage;
        break;
      case 'leave':
        completionFn = leaveConversationMessage;
        break;
      default:
        assertNever(args.type);
    }
    
    // 根据思考等级生成思考（目前只在 start 和 continue 时生成）
    let thought: string | undefined = undefined;
    // TODO: Enable thinking generation when context is available
    // const thoughtLevel = await ctx.runQuery(internal.agent.thoughtState.getAgentThoughtLevel, {
    //   agentId: args.agentId,
    //   playerId: args.playerId,
    // });
    
    const text = await completionFn(
      ctx,
      args.worldId,
      args.conversationId as GameId<'conversations'>,
      args.playerId as GameId<'players'>,
      args.otherPlayerId as GameId<'players'>,
    );

    await ctx.runMutation(internal.aiTown.agent.agentSendMessage, {
      worldId: args.worldId,
      conversationId: args.conversationId,
      agentId: args.agentId,
      playerId: args.playerId,
      text,
      thought,
      messageUuid: args.messageUuid,
      leaveConversation: args.type === 'leave',
      operationId: args.operationId,
    });
"@
$newBlock = @"
    let completionFn;
    switch (args.type) {
      case 'start':
        completionFn = startConversationMessage;
        break;
      case 'continue':
        completionFn = continueConversationMessage;
        break;
      case 'leave':
        completionFn = leaveConversationMessage;
        break;
      default:
        assertNever(args.type);
    }

    const thoughtLevel = await ctx.runQuery(internal.agent.thoughtState.getAgentThoughtLevel, {
      agentId: args.agentId,
      playerId: args.playerId,
    });
    const promptData = await ctx.runQuery(selfInternal.queryPromptData, {
      worldId: args.worldId,
      playerId: args.playerId,
      otherPlayerId: args.otherPlayerId as GameId<'players'>,
      conversationId: args.conversationId as GameId<'conversations'>,
    });

    let thought: string | undefined;
    if (thoughtLevel !== THOUGHT_LEVELS.INTUITION) {
      thought = await generateThought(
        ctx,
        args.worldId,
        args.playerId as GameId<'players'>,
        args.otherPlayerId as GameId<'players'>,
        thoughtLevel,
        promptData.player.name,
        promptData.otherPlayer.name,
        promptData.agent.identity,
      );
      if (thought) {
        const importance = getThoughtConfig(thoughtLevel).memoryLayers * 10;
        const { embedding } = await fetchEmbedding(ctx, thought);
        await ctx.runMutation(internal.agent.memory.insertMemory, {
          agentId: args.agentId,
          playerId: args.playerId,
          description: `Internal thought before responding to ${promptData.otherPlayer.name}: ${thought}`,
          importance,
          lastAccess: Date.now(),
          data: {
            type: 'reflection',
            relatedMemoryIds: [],
          },
          embedding,
        });
      }
    }

    const text = await completionFn(
      ctx,
      args.worldId,
      args.conversationId as GameId<'conversations'>,
      args.playerId as GameId<'players'>,
      args.otherPlayerId as GameId<'players'>,
      thought,
    );

    await ctx.runMutation(internal.aiTown.agent.agentSendMessage, {
      worldId: args.worldId,
      conversationId: args.conversationId,
      agentId: args.agentId,
      playerId: args.playerId,
      text,
      thought,
      messageUuid: args.messageUuid,
      leaveConversation: args.type === 'leave',
      operationId: args.operationId,
    });
"@
$agentOps = $agentOps.Replace($oldBlock, $newBlock)
Set-Content -Encoding UTF8 $agentOpsPath $agentOps

# Update debug panel caller with worldId.
$sceneDebugPath = Join-Path $root 'src\components\SceneDebugPanel.tsx'
$sceneDebug = Get-Content $sceneDebugPath -Raw
$sceneDebug = $sceneDebug.Replace("      <DebugToolboxPanel`r`n        engineId={engineId}`r`n        selectedPlayerId={selectedPlayerId}`r`n        roleLocatorEntries={roleLocatorEntries}`r`n        conversationByPlayerId={conversationByPlayerId}`r`n      />", "      <DebugToolboxPanel`r`n        engineId={engineId}`r`n        worldId={worldId}`r`n        selectedPlayerId={selectedPlayerId}`r`n        roleLocatorEntries={roleLocatorEntries}`r`n        conversationByPlayerId={conversationByPlayerId}`r`n      />")
Set-Content -Encoding UTF8 $sceneDebugPath $sceneDebug

Write-Output 'wired'
