export type SensorStatus = "ok" | "alert" | "critical";

export interface Sensor {
  id: number;
  name: string;
  value: number;
  status: SensorStatus;
  history: number[];
}

export interface DashboardSummary {
  alertCount: number;
  average: number;
  highestVariationSensor: Sensor;
  highestVariation: number;
}

export const SENSOR_COUNT = 20;
export const HISTORY_LIMIT = 30;
export const TICK_INTERVAL_MS = 500;
export const INITIAL_SEED = 0x12345678;

const INITIAL_VALUES = [
  27, 42, 62, 68, 73, 83, 91, 52, 34, 69,
  70, 15, 96, 47, 58, 80, 22, 88, 65, 38,
];

export function getSensorStatus(value: number): SensorStatus {
  if (value >= 90) return "critical";
  if (value >= 70) return "alert";
  return "ok";
}

export function createInitialSensors(): Sensor[] {
  return INITIAL_VALUES.map((value, index) => ({
    id: index + 1,
    name: `Servidor ${String(index + 1).padStart(2, "0")}`,
    value,
    status: getSensorStatus(value),
    history: [value],
  }));
}

function nextRandom(seed: number): { seed: number; value: number } {
  let nextSeed = seed >>> 0;
  nextSeed ^= nextSeed << 13;
  nextSeed ^= nextSeed >>> 17;
  nextSeed ^= nextSeed << 5;
  nextSeed >>>= 0;

  return { seed: nextSeed, value: (nextSeed % 11) - 5 };
}

export function updateAllSensors(
  sensors: Sensor[],
  seed: number,
): { sensors: Sensor[]; seed: number } {
  let nextSeed = seed;

  const updatedSensors = sensors.map((sensor) => {
    const random = nextRandom(nextSeed);
    nextSeed = random.seed;

    const value = Math.max(0, Math.min(100, sensor.value + random.value));
    const history = [...sensor.history, value].slice(-HISTORY_LIMIT);

    return {
      ...sensor,
      value,
      status: getSensorStatus(value),
      history,
    };
  });

  return { sensors: updatedSensors, seed: nextSeed };
}

function getVariation(sensor: Sensor): number {
  return Math.max(...sensor.history) - Math.min(...sensor.history);
}

export function calculateSummary(sensors: Sensor[]): DashboardSummary {
  const alertCount = sensors.filter((sensor) => sensor.status !== "ok").length;
  const total = sensors.reduce((sum, sensor) => sum + sensor.value, 0);
  const highestVariationSensor = sensors.reduce((highest, sensor) => {
    const variation = getVariation(sensor);
    const highestVariation = getVariation(highest);

    if (
      variation > highestVariation ||
      (variation === highestVariation && sensor.id < highest.id)
    ) {
      return sensor;
    }

    return highest;
  });

  return {
    alertCount,
    average: sensors.length === 0 ? 0 : total / sensors.length,
    highestVariationSensor,
    highestVariation: getVariation(highestVariationSensor),
  };
}
