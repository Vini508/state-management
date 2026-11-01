import { describe, expect, it } from "vitest";
import {
  createInitialSensors,
  INITIAL_SEED,
  SENSOR_COUNT,
  SENSOR_IDS,
  sensorIndex,
  updateAllSensors,
  updateOneSensor,
} from "./sensors";

describe("simulacao dos sensores", () => {
  it("cria SENSOR_COUNT sensores com os IDs de SENSOR_IDS e valores entre 0 e 100", () => {
    const sensors = createInitialSensors();

    expect(sensors).toHaveLength(SENSOR_COUNT);
    expect(sensors.map((sensor) => sensor.id)).toEqual(SENSOR_IDS);
    expect(sensors.every((sensor) => sensor.value >= 0 && sensor.value <= 100)).toBe(true);
  });

  it("encontra cada sensor pela posicao calculada a partir do ID", () => {
    const sensors = createInitialSensors();

    expect(SENSOR_IDS.every((id) => sensors[sensorIndex(id)]?.id === id)).toBe(true);
  });

  it("mantem os valores entre 0 e 100", () => {
    let sensors = createInitialSensors();
    let seed = INITIAL_SEED;

    for (let tick = 0; tick < 40; tick += 1) {
      ({ sensors, seed } = updateAllSensors(sensors, seed));
    }

    expect(sensors.every((sensor) => sensor.value >= 0 && sensor.value <= 100)).toBe(true);
  });

  it("atualiza apenas o sensor do indice informado", () => {
    const sensors = createInitialSensors();
    const updated = updateOneSensor(sensors, 3, INITIAL_SEED);
    const changedIndexes = updated.sensors.flatMap((sensor, index) =>
      sensor !== sensors[index] ? [index] : [],
    );

    expect(changedIndexes).toEqual([3]);
  });

  it("mantem a sequencia aleatoria deterministica", () => {
    const sensors = createInitialSensors();
    const firstRun = updateAllSensors(sensors, INITIAL_SEED);
    const secondRun = updateAllSensors(sensors, INITIAL_SEED);
    expect(firstRun).toEqual(secondRun);
  });
});
