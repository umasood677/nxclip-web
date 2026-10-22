/** Unregistered headless prototype. No component, network call or UI activation. */
import { PRODUCT_ISOLATION_VERSION, isolationSha256, type IsolationCorrection, type IsolationCorrectionHistory } from './product-isolation';
import { appendIsolationCorrection, moveIsolationCorrectionCursor, validateCorrectionHistory } from './product-isolation-corrections';
export const W8_ISOLATION_EDITOR_ENABLED_DEFAULT = false;
export function newIsolationCorrectionDraft(sourceRasterSha256: string): IsolationCorrectionHistory {
  if (!isolationSha256(sourceRasterSha256)) throw new Error('INVALID_SOURCE_HASH');
  return { schemaVersion: PRODUCT_ISOLATION_VERSION, sourceRasterSha256, revision: 0, cursor: 0, events: [] };
}
export function editIsolationCorrectionDraft(
  history: IsolationCorrectionHistory,
  action: { kind: 'append'; correction: IsolationCorrection } | { kind: 'undo' | 'redo' },
  context: { width: number; height: number; componentIds: readonly string[] },
) {
  validateCorrectionHistory(history, context.width, context.height, context.componentIds);
  const updated = action.kind === 'append' ? appendIsolationCorrection(history, action.correction) : moveIsolationCorrectionCursor(history, action.kind);
  validateCorrectionHistory(updated, context.width, context.height, context.componentIds);
  return { history: updated, approval: 'pendingReview' as const, featureEnabled: false as const };
}
