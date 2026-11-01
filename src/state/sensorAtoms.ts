import { atom } from "jotai";
import { atomWithReset, RESET } from "jotai/utils";
import {
  createInitialSensors,
  INITIAL_SEED,
  sensorIndex,
  updateAllSensors,
  updateOneSensor,
  type UpdateMode,
} from "../domain/sensors";

// Um átomo por sensor: cada card assina apenas o átomo do próprio sensor.
const sensorAtoms = createInitialSensors().map((sensor) => atomWithReset(sensor));

export const isRunningAtom = atomWithReset(false);
export const modeAtom = atomWithReset<UpdateMode>("simultaneous");
export const nextSensorIndexAtom = atomWithReset(0);
const seedAtom = atomWithReset(INITIAL_SEED);

export function getSensorAtom(id: number) {
  const sensorAtom = sensorAtoms[sensorIndex(id)];
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

  if (get(modeAtom) === "localized") {
    // Só o átomo do sensor da vez é lido e gravado; os demais nem são tocados.
    const index = get(nextSensorIndexAtom);
    const sensorAtom = sensorAtoms[index];
    const updated = updateOneSensor([get(sensorAtom)], 0, get(seedAtom));

    set(sensorAtom, updated.sensors[0]);
    set(seedAtom, updated.seed);
    set(nextSensorIndexAtom, (index + 1) % sensorAtoms.length);
    return;
  }

  const updated = updateAllSensors(
    sensorAtoms.map((sensorAtom) => get(sensorAtom)),
    get(seedAtom),
  );
  updated.sensors.forEach((sensor, index) => set(sensorAtoms[index], sensor));
  set(seedAtom, updated.seed);
});
