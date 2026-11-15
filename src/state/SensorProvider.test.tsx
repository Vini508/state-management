import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { pause, reset, start } from "./simulationSlice";
import { store } from "./store";

describe("acoes despachadas pelos controles", () => {
  it("nao levam o evento de clique como payload", () => {
    const dispatch = vi.spyOn(store, "dispatch");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar" }));
    expect(dispatch).toHaveBeenLastCalledWith(reset());

    fireEvent.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(dispatch).toHaveBeenLastCalledWith(start());

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(dispatch).toHaveBeenLastCalledWith(pause());
  });
});
