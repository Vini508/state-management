import type { RenderExpectations } from "../domain/contract";
import { SENSOR_COUNT } from "../domain/sensors";

// Jotai: cada componente assina só os átomos que lê, então a gravação do
// átomo de um sensor alcança apenas o card correspondente.
export const expectedRenders: RenderExpectations = {
  simultaneous: { sensorCards: SENSOR_COUNT, dashboard: 0, clock: 0 },
  localized: { sensorCards: 1, dashboard: 0, clock: 0 },
};
