import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TICK_INTERVAL_MS } from "./domain/sensors";
import { createMeasurement } from "./measurement";

// Este arquivo é compartilhado entre todos os branches e não pode ser alterado neles.

describe("registro da medicao", () => {
  it("ignora o aquecimento, registra as atualizacoes medidas e termina na ultima", async () => {
    const measurement = createMeasurement(3, 2);

    expect(measurement.recordTick(0, 1)).toBe(false);
    expect(measurement.recordTick(10, 12)).toBe(false);
    expect(measurement.recordTick(20, 23)).toBe(false);
    expect(measurement.recordTick(30, 34)).toBe(false);
    expect(measurement.recordTick(40, 45)).toBe(true);

    const result = await measurement.finished;
    expect(result.tickDurationsMs).toEqual([3, 4, 5]);
    expect(result.totalDurationMs).toBe(25);
    expect(result.warmupTicks).toBe(2);
    expect(result.measuredTicks).toBe(3);
  });

  it("conta so as renderizacoes ocorridas durante as atualizacoes medidas", async () => {
    const measurement = createMeasurement(2, 1);

    measurement.recordRender(7);
    measurement.recordTick(0, 1);
    measurement.recordRender(7);
    measurement.recordTick(10, 11);
    measurement.recordRender(2);
    measurement.recordRender(3);
    measurement.recordTick(20, 21);
    measurement.recordRender(7);

    const result = await measurement.finished;
    expect(result.renderCount).toBe(2);
    expect(result.renderDurationMs).toBe(5);
  });

  it("nao registra nada depois de terminar", async () => {
    const measurement = createMeasurement(1, 0);

    expect(measurement.recordTick(0, 2)).toBe(true);
    expect(measurement.recordTick(10, 19)).toBe(true);

    expect((await measurement.finished).tickDurationsMs).toEqual([2]);
  });
});

describe("medicao ativada pelo endereco", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    window.history.replaceState({}, "", "/");
    delete window.__measurement;
  });

  async function renderAppAt(url: string) {
    window.history.replaceState({}, "", url);
    vi.resetModules();
    const { default: App } = await import("./App");
    vi.useFakeTimers();
    render(<App />);
    // Redux e Zustand guardam o estado num store global, que sobrevive entre testes.
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
  }

  const runState = () => document.querySelector(".run-state")?.textContent;

  it("pausa a simulacao ao completar o aquecimento e as atualizacoes medidas", async () => {
    await renderAppAt("/?ticks=3&warmup=2");

    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * 4);
    });
    expect(runState()).toBe("Em execução");

    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS);
    });
    expect(runState()).toBe("Pausada");

    const result = await window.__measurement?.finished;
    expect(result?.tickDurationsMs).toHaveLength(3);
  });

  it("fica desligada sem o parametro ticks", async () => {
    await renderAppAt("/");

    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * 10);
    });

    expect(runState()).toBe("Em execução");
    expect(window.__measurement).toBeUndefined();
  });
});
