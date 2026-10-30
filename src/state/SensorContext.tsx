import {
  createContext,
  useContext,
  useEffect,
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

const SensorStateContext = createContext<SensorState | null>(null);
const SensorDispatchContext = createContext<Dispatch<SensorAction> | null>(null);

export function SensorProvider({ children }: Readonly<PropsWithChildren>) {
  const [state, dispatch] = useReducer(sensorReducer, undefined, createInitialState);

  useEffect(() => {
    if (!state.isRunning) return undefined;

    const intervalId = window.setInterval(
      () => dispatch({ type: "tick" }),
      TICK_INTERVAL_MS,
    );

    return () => window.clearInterval(intervalId);
  }, [state.isRunning]);

  return (
    <SensorStateContext.Provider value={state}>
      <SensorDispatchContext.Provider value={dispatch}>
        {children}
      </SensorDispatchContext.Provider>
    </SensorStateContext.Provider>
  );
}

export function useSensorState(): SensorState {
  const state = useContext(SensorStateContext);
  if (!state) {
    throw new Error("useSensorState deve ser usado dentro de SensorProvider.");
  }

  return state;
}

export function useSensorDispatch(): Dispatch<SensorAction> {
  const dispatch = useContext(SensorDispatchContext);
  if (!dispatch) {
    throw new Error("useSensorDispatch deve ser usado dentro de SensorProvider.");
  }

  return dispatch;
}
