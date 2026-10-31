import { bindActionCreators } from "@reduxjs/toolkit";
import { useMemo, type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import type { SensorActions } from "../domain/contract";
import type { Sensor, UpdateMode } from "../domain/sensors";
import {
  selectIsRunning,
  selectMode,
  selectSensorById,
  simulationSlice,
} from "./simulationSlice";
import { store, useAppDispatch, useAppSelector } from "./store";

export function SensorProvider({ children }: Readonly<PropsWithChildren>) {
  return <Provider store={store}>{children}</Provider>;
}

export function useSensor(id: number): Sensor {
  const sensor = useAppSelector((state) => selectSensorById(state, id));
  if (!sensor) {
    throw new Error(`Sensor ${id} não encontrado.`);
  }

  return sensor;
}

export function useSimulationMode(): UpdateMode {
  return useAppSelector(selectMode);
}

export function useIsRunning(): boolean {
  return useAppSelector(selectIsRunning);
}

export function useSensorActions(): SensorActions {
  const dispatch = useAppDispatch();

  return useMemo(
    () => bindActionCreators(simulationSlice.actions, dispatch) satisfies SensorActions,
    [dispatch],
  );
}
