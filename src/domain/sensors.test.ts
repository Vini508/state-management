import { describe, expect, it } from "vitest";
import {
  createInitialSensors,
  updateAllSensors,
} from "./sensors";
import { createInitialState, sensorReducer } from "../state/sensorReducer";

describe("simulacao dos sensores", () => {
  it("mantem os valores entre 0 e 100", () => {
    let state = createInitialState();
    state = sensorReducer(state, { type: "start" });

    for (let tick = 0; tick < 40; tick += 1) {
      state = sensorReducer(state, { type: "tick" });
    }

    expect(state.sensors).toHaveLength(20);
    expect(state.sensors.every((sensor) => sensor.value >= 0 && sensor.value <= 100)).toBe(true);
  });

  it("atualiza os 20 sensores por tick e ignora ticks quando pausada", () => {
    const initial = createInitialState();
    expect(sensorReducer(initial, { type: "tick" })).toBe(initial);

    const running = sensorReducer(initial, { type: "start" });
    const afterTick = sensorReducer(running, { type: "tick" });
    expect(afterTick.sensors).toHaveLength(20);
    expect(afterTick.sensors.every((sensor, index) => sensor !== initial.sensors[index])).toBe(true);
  });

  it("atualiza um sensor por tick e percorre a lista em ordem circular", () => {
    let state = createInitialState();
    state = sensorReducer(state, { type: "start" });
    state = sensorReducer(state, { type: "tick" });
    state = sensorReducer(state, { type: "set-mode", mode: "localized" });

    expect(state.isRunning).toBe(false);
    expect(state.mode).toBe("localized");
    state = sensorReducer(state, { type: "start" });

    let previousSensors = state.sensors;
    for (let index = 0; index < previousSensors.length; index += 1) {
      state = sensorReducer(state, { type: "tick" });
      const changedIndexes = state.sensors.flatMap((sensor, sensorIndex) =>
        sensor !== previousSensors[sensorIndex] ? [sensorIndex] : [],
      );

      expect(changedIndexes).toEqual([index]);
      previousSensors = state.sensors;
    }

    expect(state.nextSensorIndex).toBe(0);
  });

  it("repete a mesma sequencia depois do reset", () => {
    const initial = createInitialState();
    const runSequence = (startingState: ReturnType<typeof createInitialState>) => {
      let state = sensorReducer(startingState, { type: "start" });
      state = sensorReducer(state, { type: "tick" });
      state = sensorReducer(state, { type: "tick" });
      return state;
    };

    const firstRun = runSequence(initial);
    const resetState = sensorReducer(firstRun, { type: "reset" });
    const resetRun = runSequence(resetState);

    expect(resetState.isRunning).toBe(false);
    expect(resetRun.sensors.map((sensor) => sensor.value)).toEqual(
      firstRun.sensors.map((sensor) => sensor.value),
    );
  });

  it("mantem a sequencia aleatoria deterministica", () => {
    const sensors = createInitialSensors();
    const firstRun = updateAllSensors(sensors, 0x12345678);
    const secondRun = updateAllSensors(sensors, 0x12345678);
    expect(firstRun).toEqual(secondRun);
  });
});
