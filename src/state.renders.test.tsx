import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { RendersPerTick } from "./domain/contract";
import { TICK_INTERVAL_MS, type UpdateMode } from "./domain/sensors";
import * as state from "./state";
import { expectedRenders } from "./state/renderExpectations";

// Este arquivo é compartilhado entre todos os branches e não pode ser alterado
// neles: o que muda por branch é só src/state/renderExpectations.ts.

// Cada hook abaixo é chamado uma vez por renderização do componente que o usa,
// então contar as chamadas é contar as renderizações dos componentes reais.
vi.mock("./state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./state")>();

  return {
    ...actual,
    useSensor: vi.fn(actual.useSensor),
    useSimulationMode: vi.fn(actual.useSimulationMode),
    useIsRunning: vi.fn(actual.useIsRunning),
  };
});

const sensorCardRenders = vi.mocked(state.useSensor);
const dashboardRenders = vi.mocked(state.useSimulationMode);
// useIsRunning é chamado pelo Dashboard e pelo SimulationClock.
const dashboardAndClockRenders = vi.mocked(state.useIsRunning);

function rendersDuringOneTick(mode: UpdateMode): RendersPerTick {
  vi.useFakeTimers();
  render(<App />);
  // Redux e Zustand guardam o estado num store global, que sobrevive entre testes.
  fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
  fireEvent.change(screen.getByRole("combobox"), { target: { value: mode } });
  fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));

  sensorCardRenders.mockClear();
  dashboardRenders.mockClear();
  dashboardAndClockRenders.mockClear();
  act(() => {
    vi.advanceTimersByTime(TICK_INTERVAL_MS);
  });

  const dashboard = dashboardRenders.mock.calls.length;

  return {
    sensorCards: sensorCardRenders.mock.calls.length,
    dashboard,
    clock: dashboardAndClockRenders.mock.calls.length - dashboard,
  };
}

describe("renderizacoes por atualizacao", () => {
  afterEach(() => vi.useRealTimers());

  it("no modo simultaneo", () => {
    expect(rendersDuringOneTick("simultaneous")).toEqual(expectedRenders.simultaneous);
  });

  it("no modo localizado", () => {
    expect(rendersDuringOneTick("localized")).toEqual(expectedRenders.localized);
  });
});
