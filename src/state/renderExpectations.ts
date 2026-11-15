import type { RenderExpectations } from "../domain/contract";
import { SENSOR_COUNT } from "../domain/sensors";

// Zustand: o seletor de cada componente só provoca renderização quando o
// dado selecionado muda; o Dashboard e o relógio não leem os sensores.
export const expectedRenders: RenderExpectations = {
  simultaneous: { sensorCards: SENSOR_COUNT, dashboard: 0, clock: 0 },
  localized: { sensorCards: 1, dashboard: 0, clock: 0 },
};
