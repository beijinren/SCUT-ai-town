import { GMRuntimeContext } from '../gmTypes';
import { recordSpatialDebug } from '../debug/debugLog';
import { buildPerceptionForAgent } from '../perception/perception';
import { buildSceneGraph } from '../spatial/sceneGraph';
import { buildSpatialSemantics } from '../spatial/spatialSemantics';

export function runGMPipeline(context: GMRuntimeContext) {
  const sceneGraph = buildSceneGraph(context);
  const semantics = buildSpatialSemantics(context);
  const observations = context.actors.map((actor) => {
    const observation = buildPerceptionForAgent(context, actor.agentId);
    recordSpatialDebug({
      type: 'spatial',
      timestamp: Date.now(),
      agentId: actor.agentId,
      observation,
    });
    return observation;
  });

  return {
    sceneGraph,
    semantics,
    observations,
  };
}
