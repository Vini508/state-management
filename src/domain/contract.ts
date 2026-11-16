import type { UpdateMode } from "./sensors";

export interface SensorActions {
  start: () => void;
  pause: () => void;
  reset: () => void;
  setMode: (mode: UpdateMode) => void;
  tick: () => void;
}

// Renderizações de cada componente em uma atualização, conferidas em
// src/tests/renders.test.tsx contra o src/state/renderExpectations.ts de cada branch.
export interface RendersPerTick {
  sensorCards: number;
  dashboard: number;
  clock: number;
}

export type RenderExpectations = Record<UpdateMode, RendersPerTick>;
