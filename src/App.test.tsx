import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("dashboard de sensores", () => {
  afterEach(() => vi.useRealTimers());

  it("mostra 20 sensores, resumo e controles, iniciando pausado", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Central de sensores" })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: /Histórico de Servidor/ })).toHaveLength(20);
    expect(screen.getByText("Pausada")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Iniciar" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Pausar" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Sensores em alerta")).toBeTruthy();
    expect(screen.getByText("Média atual")).toBeTruthy();
    expect(screen.getByText("Maior variação")).toBeTruthy();
  });

  it("inicia, pausa e reinicia a atualização simultânea", () => {
    vi.useFakeTimers();
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(screen.getByText("Em execução")).toBeTruthy();

    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole("img", { name: "Histórico de Servidor 01: 2 amostras" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Histórico de Servidor 20: 2 amostras" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(screen.getByText("Pausada")).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("img", { name: "Histórico de Servidor 01: 2 amostras" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
    expect(screen.getByRole("img", { name: "Histórico de Servidor 01: 1 amostra" })).toBeTruthy();
  });
});
