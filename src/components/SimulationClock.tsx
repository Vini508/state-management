import { useEffect } from "react";
import { TICK_INTERVAL_MS } from "../domain/sensors";
import { useIsRunning, useSensorActions } from "../state";

export function SimulationClock() {
  const isRunning = useIsRunning();
  const { tick } = useSensorActions();

  useEffect(() => {
    if (!isRunning) return undefined;

    const intervalId = window.setInterval(tick, TICK_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isRunning, tick]);

  return null;
}
