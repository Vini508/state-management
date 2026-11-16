import { useEffect } from "react";
import { TICK_INTERVAL_MS } from "../domain/sensors";
import { measurement } from "../measurement";
import { useIsRunning, useSensorActions } from "../state";

export function SimulationClock() {
  const isRunning = useIsRunning();
  const { tick, pause } = useSensorActions();

  useEffect(() => {
    if (!isRunning) return undefined;

    // Em uma medição, cada atualização é cronometrada e a simulação é pausada
    // ao completar a carga; fora dela, o temporizador chama a atualização direto.
    const onInterval = measurement
      ? () => {
          const startMs = performance.now();
          tick();
          const endMs = performance.now();

          if (measurement?.recordTick(startMs, endMs)) pause();
        }
      : tick;
    const intervalId = window.setInterval(onInterval, TICK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isRunning, tick, pause]);

  return null;
}
