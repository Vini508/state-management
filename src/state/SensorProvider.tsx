import { Provider, useAtomValue, useSetAtom } from "jotai";
import { useMemo, type PropsWithChildren } from "react";
import type { SensorActions } from "../domain/contract";
import type { Sensor, UpdateMode } from "../domain/sensors";
import {
  getSensorAtom,
  isRunningAtom,
  modeAtom,
  pauseAtom,
  resetAtom,
  setModeAtom,
  startAtom,
  tickAtom,
} from "./sensorAtoms";

export function SensorProvider({ children }: Readonly<PropsWithChildren>) {
  return <Provider>{children}</Provider>;
}

export function useSensor(id: number): Sensor {
  return useAtomValue(getSensorAtom(id));
}

export function useSimulationMode(): UpdateMode {
  return useAtomValue(modeAtom);
}

export function useIsRunning(): boolean {
  return useAtomValue(isRunningAtom);
}

export function useSensorActions(): SensorActions {
  const start = useSetAtom(startAtom);
  const pause = useSetAtom(pauseAtom);
  const reset = useSetAtom(resetAtom);
  const setMode = useSetAtom(setModeAtom);
  const tick = useSetAtom(tickAtom);

  return useMemo(
    () => ({ start, pause, reset, setMode, tick }) satisfies SensorActions,
    [start, pause, reset, setMode, tick],
  );
}
