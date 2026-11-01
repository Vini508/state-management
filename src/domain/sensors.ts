export type UpdateMode = "simultaneous" | "localized";

export interface Sensor {
  id: number;
  name: string;
  value: number;
}

export const SENSOR_COUNT = 1000;
export const TICK_INTERVAL_MS = 15;
export const INITIAL_SEED = 0x12345678;
const INITIAL_VALUES_SEED = 0x9e3779b9;

// Valores iniciais entre 0 e 100, gerados pela mesma sequência em toda execução.
const INITIAL_VALUES = createInitialValues();

export const SENSOR_IDS: readonly number[] = INITIAL_VALUES.map((_, index) => index + 1);

// Os IDs são sequenciais a partir de 1, então a posição na lista é direta.
export function sensorIndex(id: number): number {
  return id - 1;
}

export function createInitialSensors(): Sensor[] {
  return INITIAL_VALUES.map((value, index) => ({
    id: index + 1,
    name: `Sensor ${String(index + 1).padStart(4, "0")}`,
    value,
  }));
}

function createInitialValues(): number[] {
  let seed = INITIAL_VALUES_SEED;

  return Array.from({ length: SENSOR_COUNT }, () => {
    seed = xorshift(seed);
    return seed % 101;
  });
}

function xorshift(seed: number): number {
  let nextSeed = seed >>> 0;
  nextSeed ^= nextSeed << 13;
  nextSeed ^= nextSeed >>> 17;
  nextSeed ^= nextSeed << 5;

  return nextSeed >>> 0;
}

function nextRandom(seed: number): { seed: number; delta: number } {
  const nextSeed = xorshift(seed);

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

