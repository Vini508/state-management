import type { UpdateMode } from "./sensors";

export interface SensorActions {
  start: () => void;
  pause: () => void;
  reset: () => void;
  setMode: (mode: UpdateMode) => void;
  tick: () => void;
}
