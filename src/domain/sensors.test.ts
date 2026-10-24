import { describe, expect, it } from "vitest";
import {
  calculateSummary,
  createInitialSensors,
  getSensorStatus,
  HISTORY_LIMIT,
  updateAllSensors,
} from "./sensors";
import { createInitialState, sensorReducer } from "../state/sensorReducer";

describe("regras dos sensores", () => {
  it("classifica os limites de status", () => {
    expect(getSensorStatus(0)).toBe("ok");
    expect(getSensorStatus(69)).toBe("ok");
    expect(getSensorStatus(70)).toBe("alert");
    expect(getSensorStatus(89)).toBe("alert");
    expect(getSensorStatus(90)).toBe("critical");
    expect(getSensorStatus(100)).toBe("critical");
  });

  it("mantém os valores entre 0 e 100 e limita o histórico a 30 amostras", () => {
    let state = createInitialState();
    state = sensorReducer(state, { type: "start" });

    for (let tick = 0; tick < HISTORY_LIMIT + 4; tick += 1) {
      state = sensorReducer(state, { type: "tick" });
    }

    expect(state.sensors).toHaveLength(20);
    expect(state.sensors.every((sensor) => sensor.value >= 0 && sensor.value <= 100)).toBe(true);
    expect(state.sensors.every((sensor) => sensor.history.length === HISTORY_LIMIT)).toBe(true);
  });

  it("atualiza os 20 sensores em cada tick e deixa o reducer inerte quando pausado", () => {
    const initial = createInitialState();
    expect(sensorReducer(initial, { type: "tick" })).toBe(initial);

    const running = sensorReducer(initial, { type: "start" });
    const afterTick = sensorReducer(running, { type: "tick" });
    expect(afterTick.sensors).toHaveLength(20);
    expect(afterTick.sensors.every((sensor) => sensor.history.length === 2)).toBe(true);
  });

  it("calcula alertas, média e maior variação com desempate pelo menor ID", () => {
    const sensors = createInitialSensors().map((sensor, index) => ({
      ...sensor,
      value: index === 0 ? 90 : 50,
      status: getSensorStatus(index === 0 ? 90 : 50),
      history: index < 2 ? [10, 30] : [50],
    }));

    const summary = calculateSummary(sensors);
    expect(summary.alertCount).toBe(1);
    expect(summary.average).toBe(52);
    expect(summary.highestVariation).toBe(20);
    expect(summary.highestVariationSensor.id).toBe(1);
  });

  it("repete a mesma sequência depois do reset", () => {
    const initial = createInitialState();
    const runSequence = (startingState: ReturnType<typeof createInitialState>) => {
      let state = sensorReducer(startingState, { type: "start" });
      state = sensorReducer(state, { type: "tick" });
      state = sensorReducer(state, { type: "tick" });
      return state;
    };

    const firstRun = runSequence(initial);
    let changed = sensorReducer(firstRun, { type: "reset" });
    const resetRun = runSequence(changed);

    expect(changed.sensors).toEqual(initial.sensors);
    expect(changed.isRunning).toBe(false);
    expect(resetRun.sensors.map((sensor) => sensor.value)).toEqual(
      firstRun.sensors.map((sensor) => sensor.value),
    );
  });

  it("mantém a sequência determinística da simulação", () => {
    const sensors = createInitialSensors();
    const firstRun = updateAllSensors(sensors, 0x12345678);
    const secondRun = updateAllSensors(sensors, 0x12345678);
    expect(firstRun).toEqual(secondRun);
  });
});
