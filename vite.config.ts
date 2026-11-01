import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/testSetup.ts"],
    restoreMocks: true,
    // Com 1.000 sensores, alguns testes do contrato passam de 5 s em modo de teste.
    testTimeout: 30_000,
  },
});
