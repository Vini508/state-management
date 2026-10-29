import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("dashboard de sensores", () => {
  afterEach(() => vi.useRealTimers());

  it("mostra 20 sensores e os controles, iniciando pausado", () => {
    const { container } = render(<App />);

    expect(screen.getByRole("heading", { name: "Central de sensores" })).toBeTruthy();
    expect(container.querySelectorAll(".sensor-card")).toHaveLength(20);
    expect(container.querySelector(".run-state")?.textContent).toBe("Pausada");
    expect(screen.getByRole("button", { name: "Iniciar" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Pausar" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("inicia, pausa e reinicia a atualizacao simultanea", () => {
    vi.useFakeTimers();
    const { container } = render(<App />);
    const values = () =>
      Array.from(container.querySelectorAll(".sensor-card p"))
        .map((element) => element.getAttribute("aria-label"));
    const initialValues = values();

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(container.querySelector(".run-state--active")).toBeTruthy();

    act(() => vi.advanceTimersByTime(500));
    expect(values()).not.toEqual(initialValues);

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(container.querySelector(".run-state--active")).toBeNull();
    const pausedValues = values();
    act(() => vi.advanceTimersByTime(1000));
    expect(values()).toEqual(pausedValues);

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
    expect(values()).toEqual(initialValues);
  });
});
