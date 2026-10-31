import { memo } from "react";
import { useSensor } from "../state";

interface SensorCardProps {
  id: number;
}

export const SensorCard = memo(function SensorCard({ id }: Readonly<SensorCardProps>) {
  const sensor = useSensor(id);

  return (
    <article className="sensor-card">
      <h3>{sensor.name}</h3>
      <p>
        {sensor.value}<span>%</span>
      </p>
    </article>
  );
});
