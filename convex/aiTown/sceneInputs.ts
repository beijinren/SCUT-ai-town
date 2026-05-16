import { v } from 'convex/values';
import { inputHandler } from './inputHandler';
import { advanceSceneRuntime } from './sceneRuntime';

export const sceneInputs = {
  advanceSceneRuntime: inputHandler({
    args: {
      reason: v.optional(v.string()),
    },
    handler: (game, now, _args) => {
      advanceSceneRuntime(game, now);
      return null;
    },
  }),
};
