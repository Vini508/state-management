import type { PropsWithChildren } from "react";
import { create } from "zustand";
import type { SensorActions } from "../domain/contract";
import {
  createInitialSensors,
  INITIAL_SEED,
  sensorIndex,
  updateAllSensors,
  updateOneSensor,
  type Sensor,
  type UpdateMode,
} from "../domain/sensors";

interface SensorState {
  sensors: Sensor[];
  isRunning: boolean;
  seed: number;
  mode: UpdateMode;
  nextSensorIndex: number;
}

interface SensorStore extends SensorState {
  // Agrupadas para que useSensorActions selecione um único objeto estável.
  actions: SensorActions;
}

function createInitialState(): SensorState {
  return {
    sensors: createInitialSensors(),
    isRunning: false,
    seed: INITIAL_SEED,
    mode: "simultaneous",
    nextSensorIndex: 0,
  };
}

export const useSensorStore = create<SensorStore>()((set) => ({
  ...createInitialState(),
  actions: {
    start: () => set({ isRunning: true }),
    pause: () => set({ isRunning: false }),
    reset: () => set(createInitialState()),
    setMode: (mode) =>
      set((state) => (state.mode === mode ? state : { ...createInitialState(), mode })),
    tick: () =>
      set((state) => {
        if (!state.isRunning) return state;
        if (state.mode === "simultaneous") {
          return updateAllSensors(state.sensors, state.seed);
        }

        return {
          ...updateOneSensor(state.sensors, state.nextSensorIndex, state.seed),
          nextSensorIndex: (state.nextSensorIndex + 1) % state.sensors.length,
        };
      }),
  },
}));

// Zustand dispensa provider (o store é global); este existe só pelo contrato.
export function SensorProvider({ children }: Readonly<PropsWithChildren>) {
  return children;
}

export function useSensor(id: number): Sensor {
  const sensor = useSensorStore((state) => state.sensors[sensorIndex(id)]);
  if (!sensor) {
    throw new Error(`Sensor ${id} não encontrado.`);
  }

  return sensor;
}

export function useSimulationMode(): UpdateMode {
  return useSensorStore((state) => state.mode);
}

export function useIsRunning(): boolean {
  return useSensorStore((state) => state.isRunning);
}

export function useSensorActions(): SensorActions {
  return useSensorStore((state) => state.actions);
}
