import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from "react";
import type { SensorActions } from "../domain/contract";
import type { Sensor, UpdateMode } from "../domain/sensors";
import {
  createInitialState,
  sensorReducer,
  type SensorState,
} from "./sensorReducer";

const SensorStateContext = createContext<SensorState | null>(null);
const SensorActionsContext = createContext<SensorActions | null>(null);

export function SensorProvider({ children }: Readonly<PropsWithChildren>) {
  const [state, dispatch] = useReducer(sensorReducer, undefined, createInitialState);

  const actions = useMemo(() => ({
    start: () => dispatch({ type: "start" }),
    pause: () => dispatch({ type: "pause" }),
    reset: () => dispatch({ type: "reset" }),
    setMode: (mode: UpdateMode) => dispatch({ type: "set-mode", mode }),
    tick: () => dispatch({ type: "tick" }),
  }) satisfies SensorActions, []);

  return (
    <SensorStateContext.Provider value={state}>
      <SensorActionsContext.Provider value={actions}>
        {children}
      </SensorActionsContext.Provider>
    </SensorStateContext.Provider>
  );
}

function useSensorStateContext(): SensorState {
  const state = useContext(SensorStateContext);
  if (!state) {
    throw new Error("Hooks de estado devem ser usados dentro de SensorProvider.");
  }

  return state;
}

export function useSensor(id: number): Sensor {
  const sensor = useSensorStateContext().sensors.find((item) => item.id === id);
  if (!sensor) {
    throw new Error(`Sensor ${id} não encontrado.`);
  }

  return sensor;
}

export function useSimulationMode(): UpdateMode {
  return useSensorStateContext().mode;
}

export function useIsRunning(): boolean {
  return useSensorStateContext().isRunning;
}

export function useSensorActions(): SensorActions {
  const actions = useContext(SensorActionsContext);
  if (!actions) {
    throw new Error("useSensorActions deve ser usado dentro de SensorProvider.");
  }

  return actions;
}
