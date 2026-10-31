import { SENSOR_COUNT, SENSOR_IDS } from "../domain/sensors";
import { useIsRunning, useSensorActions, useSimulationMode } from "../state";
import { SensorCard } from "./SensorCard";

export function Dashboard() {
  const mode = useSimulationMode();
  const isRunning = useIsRunning();
  const { start, pause, reset, setMode } = useSensorActions();

  return (
    <main className="dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">SIMULADOR LOCAL</p>
          <h1>Central de sensores</h1>
          <p className="page-header__description">
            Visão geral dos servidores monitorados.
          </p>
        </div>

        <fieldset className="controls">
          <legend className="visually-hidden">Controles da simulação</legend>
          <label className="mode-picker">
            <span>Cenário</span>
            <select
              value={mode}
              onChange={(event) => {
                const { value } = event.currentTarget;
                if (value === "simultaneous" || value === "localized") {
                  setMode(value);
                }
              }}
            >
              <option value="simultaneous">20 sensores</option>
              <option value="localized">Um por vez</option>
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

      <section className="sensor-section" aria-label="Sensores">
        <div className="section-heading">
          <div>
            <h2>Sensores</h2>
            <p>
              {mode === "simultaneous"
                ? "20 sensores a cada 500 ms"
                : "Um sensor por tick, em ordem circular · 500 ms"}
            </p>
          </div>
          <span className="sensor-count">{SENSOR_COUNT} unidades</span>
        </div>

        <div className="sensor-grid">
          {SENSOR_IDS.map((id) => (
            <SensorCard key={id} id={id} />
          ))}
        </div>
      </section>
    </main>
  );
}
