import { memo } from "react";
import type { Sensor } from "../domain/sensors";

interface SensorCardProps {
  sensor: Sensor;
}

export const SensorCard = memo(function SensorCard({ sensor }: Readonly<SensorCardProps>) {
  return (
    <article className="sensor-card">
      <h3>{sensor.name}</h3>
      <p>
        {sensor.value}<span>%</span>
      </p>
    </article>
  );
});
