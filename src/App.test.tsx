import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { SENSOR_COUNT, TICK_INTERVAL_MS } from "./domain/sensors";

describe("dashboard de sensores", () => {
  afterEach(() => vi.useRealTimers());

  it("mostra todos os sensores e os controles, iniciando pausado", () => {
    const { container } = render(<App />);

    expect(screen.getByRole("heading", { name: "Painel de sensores" })).toBeTruthy();
    expect(container.querySelectorAll(".sensor-card")).toHaveLength(SENSOR_COUNT);
    expect(container.querySelector(".run-state")?.textContent).toBe("Pausada");
    expect(screen.getByRole("button", { name: "Iniciar" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Pausar" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("inicia, pausa e reinicia a atualizacao simultanea", () => {
    vi.useFakeTimers();
    const { container } = render(<App />);
    const values = () =>
      Array.from(container.querySelectorAll(".sensor-card"))
        .map((element) => element.textContent);
    const initialValues = values();

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(container.querySelector(".run-state--active")).toBeTruthy();

    act(() => vi.advanceTimersByTime(TICK_INTERVAL_MS));
    expect(values()).not.toEqual(initialValues);

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(container.querySelector(".run-state--active")).toBeNull();
    const pausedValues = values();
    act(() => vi.advanceTimersByTime(TICK_INTERVAL_MS * 2));
    expect(values()).toEqual(pausedValues);

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
    expect(values()).toEqual(initialValues);
  });
});
