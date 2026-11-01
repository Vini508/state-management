import { memo } from "react";
import { useSensor } from "../state";

interface SensorCardProps {
  id: number;
}

export const SensorCard = memo(function SensorCard({ id }: Readonly<SensorCardProps>) {
  const sensor = useSensor(id);

  return (
    <div className="sensor-card" title={sensor.name}>
      {sensor.value}
    </div>
  );
});
