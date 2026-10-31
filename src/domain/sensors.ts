export type UpdateMode = "simultaneous" | "localized";

export interface Sensor {
  id: number;
  name: string;
  value: number;
}

export const SENSOR_COUNT = 20;
export const TICK_INTERVAL_MS = 500;
export const INITIAL_SEED = 0x12345678;

const INITIAL_VALUES = [
  27, 42, 62, 68, 73, 83, 91, 52, 34, 69,
  70, 15, 96, 47, 58, 80, 22, 88, 65, 38,
];

export const SENSOR_IDS: readonly number[] = INITIAL_VALUES.map((_, index) => index + 1);

export function createInitialSensors(): Sensor[] {
  return INITIAL_VALUES.map((value, index) => ({
    id: index + 1,
    name: `Servidor ${String(index + 1).padStart(2, "0")}`,
    value,
  }));
}

function nextRandom(seed: number): { seed: number; delta: number } {
  let nextSeed = seed >>> 0;
  nextSeed ^= nextSeed << 13;
  nextSeed ^= nextSeed >>> 17;
  nextSeed ^= nextSeed << 5;
  nextSeed >>>= 0;

  return { seed: nextSeed, delta: (nextSeed % 11) - 5 };
}

function updateSensor(
  sensor: Sensor,
  seed: number,
): { sensor: Sensor; seed: number } {
  const random = nextRandom(seed);

  return {
    seed: random.seed,
    sensor: {
      ...sensor,
      value: Math.max(0, Math.min(100, sensor.value + random.delta)),
    },
  };
}

export function updateAllSensors(
  sensors: Sensor[],
  seed: number,
): { sensors: Sensor[]; seed: number } {
  let nextSeed = seed;
  const updatedSensors = sensors.map((sensor) => {
    const updated = updateSensor(sensor, nextSeed);
    nextSeed = updated.seed;
    return updated.sensor;
  });

  return { sensors: updatedSensors, seed: nextSeed };
}

export function updateOneSensor(
  sensors: Sensor[],
  index: number,
  seed: number,
): { sensors: Sensor[]; seed: number } {
  const sensor = sensors[index];
  if (!sensor) return { sensors, seed };

  const updated = updateSensor(sensor, seed);
  const updatedSensors = [...sensors];
  updatedSensors[index] = updated.sensor;

  return { sensors: updatedSensors, seed: updated.seed };
}

