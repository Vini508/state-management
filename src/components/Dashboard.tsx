import { calculateSummary } from "../domain/sensors";
import type { UpdateMode } from "../domain/sensors";
import { useSensorState } from "../state/SensorContext";
import { SensorCard } from "./SensorCard";

export function Dashboard() {
  const { state, dispatch } = useSensorState();
  const summary = calculateSummary(state.sensors);

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

        <div className="controls" role="group" aria-label="Controles da simulação">
          <label className="mode-picker">
            <span>Cenário</span>
            <select
              aria-label="Cenário de atualização"
              value={state.mode}
              onChange={(event) => {
                const mode = event.currentTarget.value;
                if (mode === "simultaneous" || mode === "localized") {
                  dispatch({ type: "set-mode", mode: mode as UpdateMode });
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
        </div>
      </header>

      <section className="summary" aria-label="Resumo dos sensores">
        <article className="summary-card">
          <span className="summary-card__label">Sensores em alerta</span>
          <strong>{summary.alertCount}<span> / 20</span></strong>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Média atual</span>
          <strong>{summary.average.toFixed(1)}<span>%</span></strong>
        </article>
        <article className="summary-card summary-card--variation">
          <span className="summary-card__label">Maior variação</span>
          <strong>{summary.highestVariation}<span> pontos</span></strong>
          <span className="summary-card__detail">
            {summary.highestVariationSensor.name}
          </span>
        </article>
      </section>

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
          <span className="sensor-count">20 unidades</span>
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
