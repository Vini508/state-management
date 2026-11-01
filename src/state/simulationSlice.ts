import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  createInitialSensors,
  INITIAL_SEED,
  sensorIndex,
  updateAllSensors,
  updateOneSensor,
  type Sensor,
  type UpdateMode,
} from "../domain/sensors";

export interface SimulationState {
  sensors: Sensor[];
  isRunning: boolean;
  seed: number;
  mode: UpdateMode;
  nextSensorIndex: number;
}

export function createInitialState(): SimulationState {
  return {
    sensors: createInitialSensors(),
    isRunning: false,
    seed: INITIAL_SEED,
    mode: "simultaneous",
    nextSensorIndex: 0,
  };
}

export const simulationSlice = createSlice({
  name: "simulation",
  initialState: createInitialState,
  reducers: {
    start(state) {
      state.isRunning = true;
    },
    pause(state) {
      state.isRunning = false;
    },
    reset: () => createInitialState(),
    setMode: (state, action: PayloadAction<UpdateMode>) =>
      state.mode === action.payload
        ? state
        : { ...createInitialState(), mode: action.payload },
    tick(state) {
      if (!state.isRunning) return;

      const updated = state.mode === "simultaneous"
        ? updateAllSensors(state.sensors, state.seed)
        : updateOneSensor(state.sensors, state.nextSensorIndex, state.seed);

      state.sensors = updated.sensors;
      state.seed = updated.seed;
      if (state.mode === "localized") {
        state.nextSensorIndex = (state.nextSensorIndex + 1) % state.sensors.length;
      }
    },
  },
  selectors: {
    selectSensorById: (state, id: number) => state.sensors[sensorIndex(id)],
    selectMode: (state) => state.mode,
    selectIsRunning: (state) => state.isRunning,
  },
});

export const { start, pause, reset, setMode, tick } = simulationSlice.actions;
export const { selectSensorById, selectMode, selectIsRunning } = simulationSlice.selectors;
