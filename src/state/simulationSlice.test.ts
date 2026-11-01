import { describe, expect, it } from "vitest";
import { SENSOR_COUNT } from "../domain/sensors";
import {
  createInitialState,
  pause,
  reset,
  setMode,
  simulationSlice,
  start,
  tick,
  type SimulationState,
} from "./simulationSlice";

const reducer = simulationSlice.reducer;

describe("slice da simulacao", () => {
  it("mantem os valores entre 0 e 100", () => {
    let state = reducer(createInitialState(), start());

    for (let count = 0; count < 40; count += 1) {
      state = reducer(state, tick());
    }

    expect(state.sensors).toHaveLength(SENSOR_COUNT);
    expect(state.sensors.every((sensor) => sensor.value >= 0 && sensor.value <= 100)).toBe(true);
  });

  it("devolve o mesmo estado quando a acao nao muda nada", () => {
    const initial = createInitialState();
    expect(reducer(initial, tick())).toBe(initial);
    expect(reducer(initial, pause())).toBe(initial);
    expect(reducer(initial, setMode("simultaneous"))).toBe(initial);

    const running = reducer(initial, start());
    expect(reducer(running, start())).toBe(running);
  });

  it("atualiza todos os sensores por tick no modo simultaneo", () => {
    const initial = createInitialState();
    const afterTick = reducer(reducer(initial, start()), tick());

    expect(afterTick.sensors).toHaveLength(SENSOR_COUNT);
    expect(afterTick.sensors.every((sensor, index) => sensor !== initial.sensors[index])).toBe(true);
  });

  it("atualiza um sensor por tick e preserva a referencia dos demais", () => {
    let state = reducer(createInitialState(), start());
    state = reducer(state, tick());
    state = reducer(state, setMode("localized"));

    expect(state.isRunning).toBe(false);
    expect(state.mode).toBe("localized");
    state = reducer(state, start());

    let previousSensors = state.sensors;
    for (let index = 0; index < previousSensors.length; index += 1) {
      state = reducer(state, tick());
      const changedIndexes = state.sensors.flatMap((sensor, sensorIndex) =>
        sensor !== previousSensors[sensorIndex] ? [sensorIndex] : [],
      );

      expect(changedIndexes).toEqual([index]);
      previousSensors = state.sensors;
    }

    expect(state.nextSensorIndex).toBe(0);
  });

  it("repete a mesma sequencia depois do reset", () => {
    const runSequence = (startingState: SimulationState) =>
      reducer(reducer(reducer(startingState, start()), tick()), tick());

    const firstRun = runSequence(createInitialState());
    const resetState = reducer(firstRun, reset());
    const resetRun = runSequence(resetState);

    expect(resetState.isRunning).toBe(false);
    expect(resetRun.sensors.map((sensor) => sensor.value)).toEqual(
      firstRun.sensors.map((sensor) => sensor.value),
    );
  });
});
