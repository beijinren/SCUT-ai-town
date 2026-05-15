/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as GM_bridge_conversationGuardBridge from "../GM/bridge/conversationGuardBridge.js";
import type * as GM_bridge_inputBridge from "../GM/bridge/inputBridge.js";
import type * as GM_bridge_promptBridge from "../GM/bridge/promptBridge.js";
import type * as GM_debug_debugLog from "../GM/debug/debugLog.js";
import type * as GM_debug_debugQueries from "../GM/debug/debugQueries.js";
import type * as GM_debug_debugTypes from "../GM/debug/debugTypes.js";
import type * as GM_gmConfig from "../GM/gmConfig.js";
import type * as GM_gmModelConfig from "../GM/gmModelConfig.js";
import type * as GM_gmTypes from "../GM/gmTypes.js";
import type * as GM_graph_graphUtils from "../GM/graph/graphUtils.js";
import type * as GM_graph_informationGraph from "../GM/graph/informationGraph.js";
import type * as GM_graph_relationGraph from "../GM/graph/relationGraph.js";
import type * as GM_guard_guardPrompt from "../GM/guard/guardPrompt.js";
import type * as GM_guard_inferenceJudge from "../GM/guard/inferenceJudge.js";
import type * as GM_guard_knowledgeGuard from "../GM/guard/knowledgeGuard.js";
import type * as GM_guard_leakageDetector from "../GM/guard/leakageDetector.js";
import type * as GM_index from "../GM/index.js";
import type * as GM_intervention_intervention from "../GM/intervention/intervention.js";
import type * as GM_intervention_regenerate from "../GM/intervention/regenerate.js";
import type * as GM_intervention_rewriteForDemo from "../GM/intervention/rewriteForDemo.js";
import type * as GM_intervention_rollbackPlan from "../GM/intervention/rollbackPlan.js";
import type * as GM_perception_audibleResolver from "../GM/perception/audibleResolver.js";
import type * as GM_perception_observationBuilder from "../GM/perception/observationBuilder.js";
import type * as GM_perception_perception from "../GM/perception/perception.js";
import type * as GM_perception_visibilityResolver from "../GM/perception/visibilityResolver.js";
import type * as GM_runtime_gmContextLoader from "../GM/runtime/gmContextLoader.js";
import type * as GM_runtime_gmPipeline from "../GM/runtime/gmPipeline.js";
import type * as GM_runtime_gmRuntime from "../GM/runtime/gmRuntime.js";
import type * as GM_setup_assignmentHistory from "../GM/setup/assignmentHistory.js";
import type * as GM_setup_personaAssigner from "../GM/setup/personaAssigner.js";
import type * as GM_setup_personaLoader from "../GM/setup/personaLoader.js";
import type * as GM_setup_runId from "../GM/setup/runId.js";
import type * as GM_setup_scenarioConfigAdapter from "../GM/setup/scenarioConfigAdapter.js";
import type * as GM_setup_scenarioPersonaDealer from "../GM/setup/scenarioPersonaDealer.js";
import type * as GM_setup_setupTypes from "../GM/setup/setupTypes.js";
import type * as GM_spatial_objectResolver from "../GM/spatial/objectResolver.js";
import type * as GM_spatial_sceneGraph from "../GM/spatial/sceneGraph.js";
import type * as GM_spatial_spatialSemantics from "../GM/spatial/spatialSemantics.js";
import type * as GM_spatial_zoneResolver from "../GM/spatial/zoneResolver.js";
import type * as GM_tools_simulatedToolHandler from "../GM/tools/simulatedToolHandler.js";
import type * as GM_tools_toolOutcome from "../GM/tools/toolOutcome.js";
import type * as GM_tools_toolRegistry from "../GM/tools/toolRegistry.js";
import type * as GM_willingness_turnOrderResolver from "../GM/willingness/turnOrderResolver.js";
import type * as GM_willingness_willingnessCalculator from "../GM/willingness/willingnessCalculator.js";
import type * as GM_willingness_willingnessDebug from "../GM/willingness/willingnessDebug.js";
import type * as GM_willingness_willingnessTrigger from "../GM/willingness/willingnessTrigger.js";
import type * as GM_willingness_willingnessTypes from "../GM/willingness/willingnessTypes.js";
import type * as agent_conversation from "../agent/conversation.js";
import type * as agent_embeddingsCache from "../agent/embeddingsCache.js";
import type * as agent_memory from "../agent/memory.js";
import type * as agent_thoughtGenerator from "../agent/thoughtGenerator.js";
import type * as aiTown_agent from "../aiTown/agent.js";
import type * as aiTown_agentDescription from "../aiTown/agentDescription.js";
import type * as aiTown_agentInputs from "../aiTown/agentInputs.js";
import type * as aiTown_agentOperations from "../aiTown/agentOperations.js";
import type * as aiTown_conversation from "../aiTown/conversation.js";
import type * as aiTown_conversationDecisionContext from "../aiTown/conversationDecisionContext.js";
import type * as aiTown_conversationMembership from "../aiTown/conversationMembership.js";
import type * as aiTown_conversationRules from "../aiTown/conversationRules.js";
import type * as aiTown_defaultConversationRules from "../aiTown/defaultConversationRules.js";
import type * as aiTown_demoMode from "../aiTown/demoMode.js";
import type * as aiTown_game from "../aiTown/game.js";
import type * as aiTown_ids from "../aiTown/ids.js";
import type * as aiTown_inputHandler from "../aiTown/inputHandler.js";
import type * as aiTown_inputs from "../aiTown/inputs.js";
import type * as aiTown_insertInput from "../aiTown/insertInput.js";
import type * as aiTown_interactionTiming from "../aiTown/interactionTiming.js";
import type * as aiTown_location from "../aiTown/location.js";
import type * as aiTown_main from "../aiTown/main.js";
import type * as aiTown_movement from "../aiTown/movement.js";
import type * as aiTown_player from "../aiTown/player.js";
import type * as aiTown_playerDescription from "../aiTown/playerDescription.js";
import type * as aiTown_sceneProtocol from "../aiTown/sceneProtocol.js";
import type * as aiTown_sceneTypes from "../aiTown/sceneTypes.js";
import type * as aiTown_sceneVisibility from "../aiTown/sceneVisibility.js";
import type * as aiTown_semanticEnvironment from "../aiTown/semanticEnvironment.js";
import type * as aiTown_world from "../aiTown/world.js";
import type * as aiTown_worldMap from "../aiTown/worldMap.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as engine_abstractGame from "../engine/abstractGame.js";
import type * as engine_historicalObject from "../engine/historicalObject.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as messages from "../messages.js";
import type * as music from "../music.js";
import type * as testing from "../testing.js";
import type * as util_FastIntegerCompression from "../util/FastIntegerCompression.js";
import type * as util_assertNever from "../util/assertNever.js";
import type * as util_asyncMap from "../util/asyncMap.js";
import type * as util_compression from "../util/compression.js";
import type * as util_geometry from "../util/geometry.js";
import type * as util_isSimpleObject from "../util/isSimpleObject.js";
import type * as util_llm from "../util/llm.js";
import type * as util_minheap from "../util/minheap.js";
import type * as util_object from "../util/object.js";
import type * as util_sleep from "../util/sleep.js";
import type * as util_types from "../util/types.js";
import type * as util_xxhash from "../util/xxhash.js";
import type * as world from "../world.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "GM/bridge/conversationGuardBridge": typeof GM_bridge_conversationGuardBridge;
  "GM/bridge/inputBridge": typeof GM_bridge_inputBridge;
  "GM/bridge/promptBridge": typeof GM_bridge_promptBridge;
  "GM/debug/debugLog": typeof GM_debug_debugLog;
  "GM/debug/debugQueries": typeof GM_debug_debugQueries;
  "GM/debug/debugTypes": typeof GM_debug_debugTypes;
  "GM/gmConfig": typeof GM_gmConfig;
  "GM/gmModelConfig": typeof GM_gmModelConfig;
  "GM/gmTypes": typeof GM_gmTypes;
  "GM/graph/graphUtils": typeof GM_graph_graphUtils;
  "GM/graph/informationGraph": typeof GM_graph_informationGraph;
  "GM/graph/relationGraph": typeof GM_graph_relationGraph;
  "GM/guard/guardPrompt": typeof GM_guard_guardPrompt;
  "GM/guard/inferenceJudge": typeof GM_guard_inferenceJudge;
  "GM/guard/knowledgeGuard": typeof GM_guard_knowledgeGuard;
  "GM/guard/leakageDetector": typeof GM_guard_leakageDetector;
  "GM/index": typeof GM_index;
  "GM/intervention/intervention": typeof GM_intervention_intervention;
  "GM/intervention/regenerate": typeof GM_intervention_regenerate;
  "GM/intervention/rewriteForDemo": typeof GM_intervention_rewriteForDemo;
  "GM/intervention/rollbackPlan": typeof GM_intervention_rollbackPlan;
  "GM/perception/audibleResolver": typeof GM_perception_audibleResolver;
  "GM/perception/observationBuilder": typeof GM_perception_observationBuilder;
  "GM/perception/perception": typeof GM_perception_perception;
  "GM/perception/visibilityResolver": typeof GM_perception_visibilityResolver;
  "GM/runtime/gmContextLoader": typeof GM_runtime_gmContextLoader;
  "GM/runtime/gmPipeline": typeof GM_runtime_gmPipeline;
  "GM/runtime/gmRuntime": typeof GM_runtime_gmRuntime;
  "GM/setup/assignmentHistory": typeof GM_setup_assignmentHistory;
  "GM/setup/personaAssigner": typeof GM_setup_personaAssigner;
  "GM/setup/personaLoader": typeof GM_setup_personaLoader;
  "GM/setup/runId": typeof GM_setup_runId;
  "GM/setup/scenarioConfigAdapter": typeof GM_setup_scenarioConfigAdapter;
  "GM/setup/scenarioPersonaDealer": typeof GM_setup_scenarioPersonaDealer;
  "GM/setup/setupTypes": typeof GM_setup_setupTypes;
  "GM/spatial/objectResolver": typeof GM_spatial_objectResolver;
  "GM/spatial/sceneGraph": typeof GM_spatial_sceneGraph;
  "GM/spatial/spatialSemantics": typeof GM_spatial_spatialSemantics;
  "GM/spatial/zoneResolver": typeof GM_spatial_zoneResolver;
  "GM/tools/simulatedToolHandler": typeof GM_tools_simulatedToolHandler;
  "GM/tools/toolOutcome": typeof GM_tools_toolOutcome;
  "GM/tools/toolRegistry": typeof GM_tools_toolRegistry;
  "GM/willingness/turnOrderResolver": typeof GM_willingness_turnOrderResolver;
  "GM/willingness/willingnessCalculator": typeof GM_willingness_willingnessCalculator;
  "GM/willingness/willingnessDebug": typeof GM_willingness_willingnessDebug;
  "GM/willingness/willingnessTrigger": typeof GM_willingness_willingnessTrigger;
  "GM/willingness/willingnessTypes": typeof GM_willingness_willingnessTypes;
  "agent/conversation": typeof agent_conversation;
  "agent/embeddingsCache": typeof agent_embeddingsCache;
  "agent/memory": typeof agent_memory;
  "agent/thoughtGenerator": typeof agent_thoughtGenerator;
  "aiTown/agent": typeof aiTown_agent;
  "aiTown/agentDescription": typeof aiTown_agentDescription;
  "aiTown/agentInputs": typeof aiTown_agentInputs;
  "aiTown/agentOperations": typeof aiTown_agentOperations;
  "aiTown/conversation": typeof aiTown_conversation;
  "aiTown/conversationDecisionContext": typeof aiTown_conversationDecisionContext;
  "aiTown/conversationMembership": typeof aiTown_conversationMembership;
  "aiTown/conversationRules": typeof aiTown_conversationRules;
  "aiTown/defaultConversationRules": typeof aiTown_defaultConversationRules;
  "aiTown/demoMode": typeof aiTown_demoMode;
  "aiTown/game": typeof aiTown_game;
  "aiTown/ids": typeof aiTown_ids;
  "aiTown/inputHandler": typeof aiTown_inputHandler;
  "aiTown/inputs": typeof aiTown_inputs;
  "aiTown/insertInput": typeof aiTown_insertInput;
  "aiTown/interactionTiming": typeof aiTown_interactionTiming;
  "aiTown/location": typeof aiTown_location;
  "aiTown/main": typeof aiTown_main;
  "aiTown/movement": typeof aiTown_movement;
  "aiTown/player": typeof aiTown_player;
  "aiTown/playerDescription": typeof aiTown_playerDescription;
  "aiTown/sceneProtocol": typeof aiTown_sceneProtocol;
  "aiTown/sceneTypes": typeof aiTown_sceneTypes;
  "aiTown/sceneVisibility": typeof aiTown_sceneVisibility;
  "aiTown/semanticEnvironment": typeof aiTown_semanticEnvironment;
  "aiTown/world": typeof aiTown_world;
  "aiTown/worldMap": typeof aiTown_worldMap;
  constants: typeof constants;
  crons: typeof crons;
  "engine/abstractGame": typeof engine_abstractGame;
  "engine/historicalObject": typeof engine_historicalObject;
  http: typeof http;
  init: typeof init;
  messages: typeof messages;
  music: typeof music;
  testing: typeof testing;
  "util/FastIntegerCompression": typeof util_FastIntegerCompression;
  "util/assertNever": typeof util_assertNever;
  "util/asyncMap": typeof util_asyncMap;
  "util/compression": typeof util_compression;
  "util/geometry": typeof util_geometry;
  "util/isSimpleObject": typeof util_isSimpleObject;
  "util/llm": typeof util_llm;
  "util/minheap": typeof util_minheap;
  "util/object": typeof util_object;
  "util/sleep": typeof util_sleep;
  "util/types": typeof util_types;
  "util/xxhash": typeof util_xxhash;
  world: typeof world;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
