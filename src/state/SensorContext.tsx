import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from "react";
import { TICK_INTERVAL_MS } from "../domain/sensors";
import {
  createInitialState,
  sensorReducer,
  type SensorAction,
  type SensorState,
} from "./sensorReducer";

interface SensorContextValue {
  state: SensorState;
  dispatch: Dispatch<SensorAction>;
}

const SensorContext = createContext<SensorContextValue | null>(null);

export function SensorProvider({ children }: Readonly<PropsWithChildren>) {
  const [state, dispatch] = useReducer(sensorReducer, undefined, createInitialState);
  
  const value = useMemo(() => ({ state, dispatch }), [state]);

  useEffect(() => {
    if (!state.isRunning) return undefined;

    const intervalId = window.setInterval(
      () => dispatch({ type: "tick" }),
      TICK_INTERVAL_MS,
    );

    return () => window.clearInterval(intervalId);
  }, [state.isRunning]);

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
}

export function useSensorState(): SensorContextValue {
  const context = useContext(SensorContext);
  if (!context) {
    throw new Error("useSensorState deve ser usado dentro de SensorProvider.");
  }

  return context;
}
