import type { RenderExpectations } from "../domain/contract";
import { SENSOR_COUNT } from "../domain/sensors";

// Context API: todo consumidor do contexto de estado renderiza a cada
// atualização, mesmo quando só um sensor muda.
export const expectedRenders: RenderExpectations = {
  simultaneous: { sensorCards: SENSOR_COUNT, dashboard: 1, clock: 1 },
  localized: { sensorCards: SENSOR_COUNT, dashboard: 1, clock: 1 },
};
