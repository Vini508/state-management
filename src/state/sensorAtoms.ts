import { atom } from "jotai";
import { atomWithReset, RESET } from "jotai/utils";
import {
  createInitialSensors,
  INITIAL_SEED,
  updateAllSensors,
  updateOneSensor,
  type UpdateMode,
} from "../domain/sensors";

// Um átomo por sensor: cada card assina apenas o átomo do próprio sensor.
const sensorAtoms = new Map(
  createInitialSensors().map((sensor) => [sensor.id, atomWithReset(sensor)] as const),
);

export const isRunningAtom = atomWithReset(false);
export const modeAtom = atomWithReset<UpdateMode>("simultaneous");
export const nextSensorIndexAtom = atomWithReset(0);
const seedAtom = atomWithReset(INITIAL_SEED);

export function getSensorAtom(id: number) {
  const sensorAtom = sensorAtoms.get(id);
  if (!sensorAtom) {
    throw new Error(`Sensor ${id} não encontrado.`);
  }

  return sensorAtom;
}

export const startAtom = atom(null, (_get, set) => set(isRunningAtom, true));

export const pauseAtom = atom(null, (_get, set) => set(isRunningAtom, false));

export const resetAtom = atom(null, (_get, set) => {
  sensorAtoms.forEach((sensorAtom) => set(sensorAtom, RESET));
  set(isRunningAtom, RESET);
  set(modeAtom, RESET);
  set(nextSensorIndexAtom, RESET);
  set(seedAtom, RESET);
});

export const setModeAtom = atom(null, (get, set, mode: UpdateMode) => {
  if (get(modeAtom) === mode) return;

  set(resetAtom);
  set(modeAtom, mode);
});

export const tickAtom = atom(null, (get, set) => {
  if (!get(isRunningAtom)) return;

  const mode = get(modeAtom);
  const sensors = [...sensorAtoms.values()].map((sensorAtom) => get(sensorAtom));
  const updated = mode === "simultaneous"
    ? updateAllSensors(sensors, get(seedAtom))
    : updateOneSensor(sensors, get(nextSensorIndexAtom), get(seedAtom));

  // Gravar o mesmo objeto não notifica: só os átomos alterados avisam seus cards.
  updated.sensors.forEach((sensor) => set(getSensorAtom(sensor.id), sensor));
  set(seedAtom, updated.seed);
  if (mode === "localized") {
    set(nextSensorIndexAtom, (index) => (index + 1) % sensors.length);
  }
});
