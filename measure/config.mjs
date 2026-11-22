// Único lugar em que os parâmetros da medição são definidos.
// A justificativa de cada valor está em Docs/plano-medicao.md, seção 1.
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MEASURE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_DIR = path.dirname(MEASURE_DIR);
export const RESULTS_DIR = path.join(MEASURE_DIR, "results");
// Fora do OneDrive, para a sincronização não interferir nas execuções.
export const WORK_DIR = "C:\\tcc-medicao";
export const CHROME_PATH =
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

// packages: pacotes cujas funções contam como "funções da biblioteca" (H1).
// statePackages: pacotes que um componente não deveria importar direto.
export const IMPLEMENTATIONS = [
  { id: "context", branch: "main", label: "Context API", packages: ["react"], statePackages: [] },
  {
    id: "redux",
    branch: "redux",
    label: "Redux",
    packages: ["@reduxjs/toolkit", "react-redux"],
    statePackages: ["@reduxjs/toolkit", "react-redux", "redux"],
  },
  { id: "zustand", branch: "zustand", label: "Zustand", packages: ["zustand"], statePackages: ["zustand"] },
  {
    id: "jotai",
    branch: "jotai",
    label: "Jotai",
    packages: ["jotai", "jotai/utils"],
    statePackages: ["jotai", "jotai/utils"],
  },
];

export const SCENARIOS = ["simultaneous", "localized"];
export const CORE_SENSOR_COUNT = 1000;
// Extensão de escala (parte C): só no cenário localizado. O tamanho de 1.000
// repete o do núcleo para que a curva inteira saia de uma mesma sessão
// (decisão de 21/11/2026, Docs/plano-medicao.md, seção 1.1).
export const SCALE_SENSOR_COUNTS = [100, 1000, 10000];
export const SCALE_SCENARIO = "localized";

export const MEASURED_TICKS = 2000;
export const WARMUP_TICKS = 200;

export const BLOCKS = 31;
// O bloco 1 é aquecimento da máquina e não entra na análise.
export const DISCARDED_BLOCKS = 1;
export const VALID_RUNS_PER_GROUP = BLOCKS - DISCARDED_BLOCKS;
export const REHEARSAL_BLOCKS = 2;
export const MAX_EXTRA_BLOCKS = 10;
export const SHUFFLE_SEED = 20261115;

export const VIEWPORT = { width: 1920, height: 1080 };
export const PAUSE_BETWEEN_RUNS_MS = 2000;
export const RUN_TIMEOUT_MS = 180_000;
// Parte C: no ensaio, a Context API com 10.000 sensores chegou a 153,6 s. Com
// 180 s, as execuções mais lentas tenderiam a ser invalidadas e a média desse
// tamanho sairia artificialmente baixa. O limite só protege contra travamentos
// (decisão de 22/11/2026, Docs/plano-medicao.md, seção 1.1).
export const SCALE_RUN_TIMEOUT_MS = 600_000;
export const BASE_PORT = 4173;

// Um frame a 60 Hz dura 16,7 ms; acima de um frame e meio, ao menos um foi perdido.
export const FRAME_MS = 1000 / 60;
export const LATE_FRAME_MS = FRAME_MS * 1.5;

// Mesma regra do Dashboard: o divisor mais próximo da proporção da grade de 40 × 25.
export function gridColumns(count) {
  const target = Math.sqrt(count * 1.6);
  let columns = 1;

  for (let divisor = 2; divisor <= count; divisor += 1) {
    if (count % divisor === 0 && Math.abs(divisor - target) < Math.abs(columns - target)) {
      columns = divisor;
    }
  }

  return columns;
}

export function workDir(implementationId) {
  return path.join(WORK_DIR, implementationId);
}

export function profilingOutDir(sensorCount) {
  return `dist-profiling-${sensorCount}`;
}
