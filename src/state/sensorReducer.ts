import {
  createInitialSensors,
  INITIAL_SEED,
  updateAllSensors,
  updateOneSensor,
  type Sensor,
  type UpdateMode,
} from "../domain/sensors";

export interface SensorState {
  sensors: Sensor[];
  isRunning: boolean;
  seed: number;
  mode: UpdateMode;
  nextSensorIndex: number;
}

export type SensorAction =
  | { type: "start" }
  | { type: "pause" }
  | { type: "reset" }
  | { type: "set-mode"; mode: UpdateMode }
  | { type: "tick" };

export function createInitialState(): SensorState {
  return {
    sensors: createInitialSensors(),
    isRunning: false,
    seed: INITIAL_SEED,
    mode: "simultaneous",
    nextSensorIndex: 0,
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
    case "set-mode":
      return state.mode === action.mode
        ? state
        : { ...createInitialState(), mode: action.mode };
    case "tick": {
      if (!state.isRunning) return state;

      const updated = state.mode === "simultaneous"
        ? updateAllSensors(state.sensors, state.seed)
        : updateOneSensor(state.sensors, state.nextSensorIndex, state.seed);

      return {
        ...state,
        sensors: updated.sensors,
        seed: updated.seed,
        nextSensorIndex: state.mode === "localized"
          ? (state.nextSensorIndex + 1) % state.sensors.length
          : state.nextSensorIndex,
      };
    }
  }
}
