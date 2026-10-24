import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Sensor } from "../domain/sensors";

interface SensorCardProps {
  sensor: Sensor;
}

const STATUS_LABELS = {
  ok: "OK",
  alert: "Alerta",
  critical: "Crítico",
} as const;

const STATUS_COLORS = {
  ok: "#16856b",
  alert: "#c47a13",
  critical: "#c74646",
} as const;

export function SensorCard({ sensor }: SensorCardProps) {
  const chartData = sensor.history.map((value, index) => ({ index, value }));
  const sampleLabel = sensor.history.length === 1 ? "amostra" : "amostras";

  return (
    <article className="sensor-card" data-status={sensor.status}>
      <header className="sensor-card__header">
        <h3>{sensor.name}</h3>
        <span className={`status status--${sensor.status}`}>
          <span className="status__dot" aria-hidden="true" />
          {STATUS_LABELS[sensor.status]}
        </span>
      </header>

      <p className="sensor-card__value" aria-label={`Valor atual: ${sensor.value}%`}>
        {sensor.value}<span>%</span>
      </p>

      <div
        className="sensor-card__chart"
        role="img"
        aria-label={`Histórico de ${sensor.name}: ${sensor.history.length} ${sampleLabel}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 4, bottom: 2, left: 4 }}>
            <Tooltip
              formatter={(value) => [`${value}%`, "Valor"]}
              labelFormatter={() => sensor.name}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={STATUS_COLORS[sensor.status]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
