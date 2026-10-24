import {
  createInitialSensors,
  INITIAL_SEED,
  updateAllSensors,
  type Sensor,
} from "../domain/sensors";

export interface SensorState {
  sensors: Sensor[];
  isRunning: boolean;
  seed: number;
}

export type SensorAction =
  | { type: "start" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "tick" };

export function createInitialState(): SensorState {
  return {
    sensors: createInitialSensors(),
    isRunning: false,
    seed: INITIAL_SEED,
  };
}

export function sensorReducer(
  state: SensorState,
  action: SensorAction,
): SensorState {
  switch (action.type) {
    case "start":
      return state.isRunning ? state : { ...state, isRunning: true };
    case "pause":
      return state.isRunning ? { ...state, isRunning: false } : state;
    case "reset":
      return createInitialState();
    case "tick": {
      if (!state.isRunning) return state;

      const updated = updateAllSensors(state.sensors, state.seed);
      return {
        ...state,
        sensors: updated.sensors,
        seed: updated.seed,
      };
    }
  }
}
