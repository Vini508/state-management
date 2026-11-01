import { beforeEach, describe, expect, it, vi } from "vitest";
import { SENSOR_COUNT } from "../domain/sensors";
import { useSensorStore } from "./sensorStore";

const { getState, subscribe } = useSensorStore;
const { actions } = getState();

describe("store da simulacao", () => {
  beforeEach(() => actions.reset());

  it("mantem os valores entre 0 e 100", () => {
    actions.start();

    for (let count = 0; count < 40; count += 1) {
      actions.tick();
    }

    const { sensors } = getState();
    expect(sensors).toHaveLength(SENSOR_COUNT);
    expect(sensors.every((sensor) => sensor.value >= 0 && sensor.value <= 100)).toBe(true);
  });

  it("nao notifica os assinantes quando a acao nao muda nada", () => {
    const initial = getState();
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    actions.tick();
    actions.setMode("simultaneous");
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
    expect(getState()).toBe(initial);
  });

  it("preserva o objeto de acoes ao reiniciar e trocar de modo", () => {
    actions.setMode("localized");
    actions.reset();

    expect(getState().actions).toBe(actions);
  });

  it("atualiza todos os sensores por tick no modo simultaneo", () => {
    const initialSensors = getState().sensors;
    actions.start();
    actions.tick();

    const { sensors } = getState();
    expect(sensors).toHaveLength(SENSOR_COUNT);
    expect(sensors.every((sensor, index) => sensor !== initialSensors[index])).toBe(true);
  });

  it("atualiza um sensor por tick e preserva a referencia dos demais", () => {
    actions.start();
    actions.tick();
    actions.setMode("localized");

    expect(getState().isRunning).toBe(false);
    expect(getState().mode).toBe("localized");
    actions.start();

    let previousSensors = getState().sensors;
    for (let index = 0; index < previousSensors.length; index += 1) {
      actions.tick();
      const { sensors } = getState();
      const changedIndexes = sensors.flatMap((sensor, sensorIndex) =>
        sensor !== previousSensors[sensorIndex] ? [sensorIndex] : [],
      );

      expect(changedIndexes).toEqual([index]);
      previousSensors = sensors;
    }

    expect(getState().nextSensorIndex).toBe(0);
  });

  it("repete a mesma sequencia depois do reset", () => {
    const runSequence = () => {
      actions.start();
      actions.tick();
      actions.tick();
      return getState().sensors.map((sensor) => sensor.value);
    };

    const firstRun = runSequence();
    actions.reset();

    expect(getState().isRunning).toBe(false);
    expect(runSequence()).toEqual(firstRun);
  });
});
