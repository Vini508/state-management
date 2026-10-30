import { SENSOR_COUNT } from "../domain/sensors";
import { useSensorDispatch, useSensorState } from "../state/SensorContext";
import { SensorCard } from "./SensorCard";

export function Dashboard() {
  const state = useSensorState();
  const dispatch = useSensorDispatch();

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
              value={state.mode}
              onChange={(event) => {
                const mode = event.currentTarget.value;
                if (mode === "simultaneous" || mode === "localized") {
                  dispatch({ type: "set-mode", mode });
                }
              }}
            >
              <option value="simultaneous">20 sensores</option>
              <option value="localized">Um por vez</option>
            </select>
          </label>
          <span className={`run-state ${state.isRunning ? "run-state--active" : ""}`}>
            <span className="run-state__dot" aria-hidden="true" />
            {state.isRunning ? "Em execução" : "Pausada"}
          </span>
          <button
            className="button button--primary"
            type="button"
            onClick={() => dispatch({ type: "start" })}
            disabled={state.isRunning}
          >
            Iniciar
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => dispatch({ type: "pause" })}
            disabled={!state.isRunning}
          >
            Pausar
          </button>
          <button
            className="button button--quiet"
            type="button"
            onClick={() => dispatch({ type: "reset" })}
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
              {state.mode === "simultaneous"
                ? "20 sensores a cada 500 ms"
                : "Um sensor por tick, em ordem circular · 500 ms"}
            </p>
          </div>
          <span className="sensor-count">{SENSOR_COUNT} unidades</span>
        </div>

        <div className="sensor-grid">
          {state.sensors.map((sensor) => (
            <SensorCard key={sensor.id} sensor={sensor} />
          ))}
        </div>
      </section>
    </main>
  );
}
