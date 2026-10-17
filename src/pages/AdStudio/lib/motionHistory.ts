import type { AdMotionSceneGraph } from "./motionTypes";

const DEFAULT_LIMIT = 40;

export type MotionHistoryState = {
  past: AdMotionSceneGraph[];
  present: AdMotionSceneGraph;
  future: AdMotionSceneGraph[];
};

export function createMotionHistory(present: AdMotionSceneGraph): MotionHistoryState {
  return { past: [], present, future: [] };
}

export function pushMotionHistory(
  state: MotionHistoryState,
  next: AdMotionSceneGraph,
  limit = DEFAULT_LIMIT,
): MotionHistoryState {
  if (next === state.present) return state;
  return {
    past: [...state.past.slice(-(limit - 1)), state.present],
    present: next,
    future: [],
  };
}

export function undoMotionHistory(state: MotionHistoryState): MotionHistoryState {
  if (!state.past.length) return state;
  const previous = state.past[state.past.length - 1]!;
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoMotionHistory(state: MotionHistoryState): MotionHistoryState {
  if (!state.future.length) return state;
  const next = state.future[0]!;
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}

export function replacePresent(
  state: MotionHistoryState,
  present: AdMotionSceneGraph,
): MotionHistoryState {
  return { ...state, present };
}
