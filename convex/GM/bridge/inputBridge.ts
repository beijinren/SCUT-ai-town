import { GMRuntime } from '../runtime/gmRuntime';
import { GMRuntimeContext } from '../gmTypes';

export function evaluateActionIntent(runtimeContext: GMRuntimeContext, actionIntent: string) {
  const runtime = new GMRuntime(runtimeContext);
  return runtime.checkActionIntent(actionIntent);
}
