import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // "vite build --mode profiling" gera um build de produção em que o <Profiler>
  // do React funciona, usado nas medições em execução.
  resolve:
    mode === "profiling"
      ? { alias: { "react-dom/client": "react-dom/profiling" } }
      : {},
  preview: {
    // Isolamento de origem: dá ao performance.now a precisão de 0,005 ms,
    // em vez de 0,1 ms.
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/testSetup.ts"],
    restoreMocks: true,
    // Com 1.000 sensores, alguns testes do contrato passam de 5 s em modo de teste.
    testTimeout: 30_000,
  },
}));
