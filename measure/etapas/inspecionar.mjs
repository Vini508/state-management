// Serve o build de profiling de uma versão para a inspeção manual com o
// React DevTools. Uso: npm run inspect -- <context|redux|zustand|jotai>
import { BASE_PORT, CORE_SENSOR_COUNT, IMPLEMENTATIONS, profilingOutDir, workDir } from "../config.mjs";
import { startPreview } from "../apoio/servidores.mjs";

const id = process.argv[2];
const implementation = IMPLEMENTATIONS.find((candidate) => candidate.id === id);
if (!implementation) {
  console.error(`Informe a versão: ${IMPLEMENTATIONS.map((candidate) => candidate.id).join(", ")}.`);
  process.exit(1);
}

const server = await startPreview(
  workDir(implementation.id),
  profilingOutDir(CORE_SENSOR_COUNT),
  BASE_PORT + 90,
);
console.log(`${implementation.label} (build de profiling) em: ${server.url}`);
console.log("Abra esse endereço no Chrome. Para encerrar, pressione Ctrl+C.");
process.on("SIGINT", () => {
  server.stop();
  process.exit(0);
});
