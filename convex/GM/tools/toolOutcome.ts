import { GMToolOutcomeKind } from '../gmTypes';

export interface GMToolOutcome {
  kind: GMToolOutcomeKind;
  action: string;
  detail: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}
