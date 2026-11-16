import type { CSSProperties } from "react";
import { SENSOR_COUNT, SENSOR_IDS, TICK_INTERVAL_MS } from "../domain/sensors";
import { useIsRunning, useSensorActions, useSimulationMode } from "../state";
import { SensorCard } from "./SensorCard";

// A grade ocupa a tela inteira em qualquer tamanho: as colunas são o divisor
// de SENSOR_COUNT que mais aproxima as células da proporção da grade de
// 40 × 25 usada com 1.000 sensores.
function gridColumns(count: number): number {
  const target = Math.sqrt(count * 1.6);
  let columns = 1;

  for (let divisor = 2; divisor <= count; divisor += 1) {
    if (count % divisor === 0 && Math.abs(divisor - target) < Math.abs(columns - target)) {
      columns = divisor;
    }
  }

  return columns;
}

const GRID_COLUMNS = gridColumns(SENSOR_COUNT);
const GRID_STYLE = {
  "--grid-columns": GRID_COLUMNS,
  "--grid-rows": SENSOR_COUNT / GRID_COLUMNS,
} as CSSProperties;

export function Dashboard() {
  const mode = useSimulationMode();
  const isRunning = useIsRunning();
  const { start, pause, reset, setMode } = useSensorActions();

  return (
    <main className="dashboard">
      <header className="page-header">
        <div>
          <h1>Painel de sensores</h1>
          <p className="page-header__description">
            {mode === "simultaneous"
              ? `Os ${SENSOR_COUNT.toLocaleString("pt-BR")} sensores são atualizados a cada ${TICK_INTERVAL_MS} ms.`
              : `Um sensor é atualizado a cada ${TICK_INTERVAL_MS} ms, em ordem circular.`}
          </p>
        </div>

        <fieldset className="controls">
          <legend className="visually-hidden">Controles da simulação</legend>
          <label className="mode-picker">
            <span>Atualização</span>
            <select
              value={mode}
              onChange={(event) => {
                const { value } = event.currentTarget;
                if (value === "simultaneous" || value === "localized") {
                  setMode(value);
                }
              }}
            >
              <option value="simultaneous">Simultânea</option>
              <option value="localized">Localizada</option>
            </select>
          </label>
          <span className={`run-state ${isRunning ? "run-state--active" : ""}`}>
            <span className="run-state__dot" aria-hidden="true" />
            {isRunning ? "Em execução" : "Pausada"}
          </span>
          <button
            className="button button--primary"
            type="button"
            onClick={start}
            disabled={isRunning}
          >
            Iniciar
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={pause}
            disabled={!isRunning}
          >
            Pausar
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={reset}
          >
            Reiniciar
          </button>
        </fieldset>
      </header>

      <section className="sensor-grid" aria-label="Sensores" style={GRID_STYLE}>
        {SENSOR_IDS.map((id) => (
          <SensorCard key={id} id={id} />
        ))}
      </section>
    </main>
  );
}
