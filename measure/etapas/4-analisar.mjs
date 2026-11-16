// Roda a análise estatística (medicoes/estatistica.py) sobre a pasta de resultados em uso.
// Uso: npm run analyze
// Na primeira vez, cria o ambiente Python fora do OneDrive e instala os pacotes
// de requirements.txt.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { MEASURE_DIR, WORK_DIR } from "../config.mjs";
import { currentResultsDir } from "../apoio/util.mjs";

const venv = path.join(WORK_DIR, ".venv");
const python = path.join(venv, "Scripts", "python.exe");

function must(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`Falhou: ${command} ${args.join(" ")}`);
    process.exit(1);
  }
}

if (!fs.existsSync(python)) {
  console.log("Preparando o ambiente Python (só na primeira vez; leva alguns minutos)...");
  fs.mkdirSync(WORK_DIR, { recursive: true });
  must("python", ["-m", "venv", venv]);
  must(python, ["-m", "pip", "install", "--quiet", "-r", path.join(MEASURE_DIR, "requirements.txt")]);
}

const dirArg = process.argv.find((arg) => arg.startsWith("--subpasta="));
const resultsDir = dirArg
  ? path.join(currentResultsDir(), dirArg.slice("--subpasta=".length))
  : currentResultsDir();

const result = spawnSync(python, [path.join(MEASURE_DIR, "medicoes", "estatistica.py"), resultsDir], { stdio: "inherit" });
process.exit(result.status ?? 1);
