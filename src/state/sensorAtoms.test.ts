import { createStore, type Store } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialSensors, SENSOR_IDS } from "../domain/sensors";
import {
  getSensorAtom,
  isRunningAtom,
  modeAtom,
  nextSensorIndexAtom,
  pauseAtom,
  resetAtom,
  setModeAtom,
  startAtom,
  tickAtom,
} from "./sensorAtoms";

let store = createStore();
const sensors = (target: Store = store) =>
  SENSOR_IDS.map((id) => target.get(getSensorAtom(id)));

describe("atomos da simulacao", () => {
  beforeEach(() => {
    store = createStore();
  });

  it("mantem os valores entre 0 e 100", () => {
    store.set(startAtom);

    for (let count = 0; count < 40; count += 1) {
      store.set(tickAtom);
    }

    expect(sensors().every((sensor) => sensor.value >= 0 && sensor.value <= 100)).toBe(true);
  });

  it("nao notifica os assinantes quando a acao nao muda nada", () => {
    const listener = vi.fn();
    const watchedAtoms = [isRunningAtom, modeAtom, ...SENSOR_IDS.map((id) => getSensorAtom(id))];
    for (const watchedAtom of watchedAtoms) {
      store.sub(watchedAtom, listener);
    }

    store.set(tickAtom);
    store.set(pauseAtom);
    store.set(setModeAtom, "simultaneous");
    expect(listener).not.toHaveBeenCalled();

    store.set(startAtom);
    store.set(startAtom);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("guarda o estado no store, e nao no atomo", () => {
    const otherStore = createStore();
    store.set(startAtom);
    store.set(tickAtom);

    expect(otherStore.get(isRunningAtom)).toBe(false);
    expect(sensors(otherStore)).toEqual(createInitialSensors());
  });

  it("atualiza todos os sensores por tick no modo simultaneo", () => {
    const initialSensors = sensors();
    store.set(startAtom);
    store.set(tickAtom);

    expect(sensors().every((sensor, index) => sensor !== initialSensors[index])).toBe(true);
  });

  it("atualiza um sensor por tick e preserva a referencia dos demais", () => {
    store.set(startAtom);
    store.set(tickAtom);
    store.set(setModeAtom, "localized");

    expect(store.get(isRunningAtom)).toBe(false);
    expect(store.get(modeAtom)).toBe("localized");
    store.set(startAtom);

    let previousSensors = sensors();
    for (let index = 0; index < previousSensors.length; index += 1) {
      store.set(tickAtom);
      const currentSensors = sensors();
      const changedIndexes = currentSensors.flatMap((sensor, sensorIndex) =>
        sensor !== previousSensors[sensorIndex] ? [sensorIndex] : [],
      );

      expect(changedIndexes).toEqual([index]);
      previousSensors = currentSensors;
    }

    expect(store.get(nextSensorIndexAtom)).toBe(0);
  });

  it("repete a mesma sequencia depois do reset", () => {
    const runSequence = () => {
      store.set(startAtom);
      store.set(tickAtom);
      store.set(tickAtom);
      return sensors().map((sensor) => sensor.value);
    };

    const firstRun = runSequence();
    store.set(resetAtom);

    expect(store.get(isRunningAtom)).toBe(false);
    expect(runSequence()).toEqual(firstRun);
  });
});
