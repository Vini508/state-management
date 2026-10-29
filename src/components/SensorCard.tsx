import type { Sensor } from "../domain/sensors";

interface SensorCardProps {
  sensor: Sensor;
}

export function SensorCard({ sensor }: Readonly<SensorCardProps>) {
  return (
    <article className="sensor-card">
      <h3>{sensor.name}</h3>
      <p aria-label={`Valor atual: ${sensor.value}%`}>
        {sensor.value}<span>%</span>
      </p>
    </article>
  );
}
