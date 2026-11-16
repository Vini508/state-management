// Prepara a medição: exporta as quatro branches para fora do OneDrive, instala
// as dependências, gera os builds, mede o pacote, conta o código e registra o
// ambiente. Uso: npm run setup
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import {
  CHROME_PATH,
  CORE_SENSOR_COUNT,
  IMPLEMENTATIONS,
  MEASURE_DIR,
  REPO_DIR,
  RESULTS_DIR,
  SCALE_SENSOR_COUNTS,
  WORK_DIR,
  profilingOutDir,
  workDir,
} from "../config.mjs";
import { measureBundle, measureCode } from "../medicoes/codigo.mjs";
import { run, setCurrentResultsDir, timestamp, writeCsv } from "../apoio/util.mjs";

// O tar do Windows entende caminhos com letra de unidade; o do Git Bash, não.
const TAR = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe");
const SENSOR_COUNTS = [CORE_SENSOR_COUNT, ...SCALE_SENSOR_COUNTS];

function git(...args) {
  return run("git", args, { cwd: REPO_DIR });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function step(message) {
  console.log(`\n== ${message}`);
}

const dirty = git("status", "--porcelain");
if (dirty.length > 0) {
  console.log("Aviso: há alterações sem commit no repositório. Só o que está commitado é medido.");
}

fs.mkdirSync(WORK_DIR, { recursive: true });
const commits = {};

for (const implementation of IMPLEMENTATIONS) {
  const appDir = workDir(implementation.id);
  step(`${implementation.label}: exportando a branch ${implementation.branch}`);
  commits[implementation.id] = git("rev-parse", implementation.branch);

  // O node_modules é preservado entre preparações; o npm ci o refaz se preciso.
  if (fs.existsSync(appDir)) {
    for (const entry of fs.readdirSync(appDir)) {
      if (entry !== "node_modules") fs.rmSync(path.join(appDir, entry), { recursive: true, force: true });
    }
  }
  fs.mkdirSync(appDir, { recursive: true });
  const archive = path.join(WORK_DIR, `${implementation.id}.tar`);
  git("archive", "--format=tar", "-o", archive, implementation.branch);
  run(TAR, ["-xf", archive, "-C", appDir]);
  fs.rmSync(archive);

  console.log("   instalando dependências (npm ci)");
  run("npm", ["ci", "--no-fund", "--no-audit"], { cwd: appDir, shell: true });

  const node = (script, args, env = {}) =>
    run(process.execPath, [path.join(appDir, "node_modules", script), ...args], {
      cwd: appDir,
      env: { ...process.env, ...env },
    });

  console.log("   build de produção normal");
  node("typescript/bin/tsc", ["-b"]);
  node("vite/bin/vite.js", ["build", "--outDir", "dist"], { VITE_SENSOR_COUNT: String(CORE_SENSOR_COUNT) });

  for (const sensorCount of SENSOR_COUNTS) {
    console.log(`   build de profiling com ${sensorCount} sensores`);
    node(
      "vite/bin/vite.js",
      ["build", "--mode", "profiling", "--outDir", profilingOutDir(sensorCount)],
      { VITE_SENSOR_COUNT: String(sensorCount) },
    );
  }
}

step("Medindo o pacote e contando o código");
const resultsDir = path.join(RESULTS_DIR, timestamp());
fs.mkdirSync(resultsDir, { recursive: true });

const bundleRows = [];
const codeRows = [];
const codeDetails = {};
for (const implementation of IMPLEMENTATIONS) {
  const appDir = workDir(implementation.id);
  bundleRows.push({ implementacao: implementation.id, ...measureBundle(appDir, "dist") });
  const { detalhe, ...counts } = measureCode(appDir, implementation);
  codeRows.push({ implementacao: implementation.id, ...counts });
  codeDetails[implementation.id] = detalhe;
}
writeCsv(
  path.join(resultsDir, "pacote.csv"),
  ["implementacao", "js_bytes", "js_gzip_bytes", "css_bytes", "css_gzip_bytes"],
  bundleRows,
);
writeCsv(
  path.join(resultsDir, "codigo.csv"),
  ["implementacao", "arquivos_de_estado", "linhas_de_codigo", "funcoes_da_biblioteca", "componentes_acoplados"],
  codeRows,
);
fs.writeFileSync(path.join(resultsDir, "codigo-detalhe.json"), JSON.stringify(codeDetails, null, 2));

step("Registrando o ambiente");
const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
const chromeVersion = await browser.version();
await browser.close();

let storage = [];
try {
  const output = run("powershell", [
    "-NoProfile",
    "-Command",
    "Get-PhysicalDisk | Select-Object FriendlyName,MediaType,Size | ConvertTo-Json",
  ]);
  storage = [JSON.parse(output)].flat();
} catch {
  // Sem essa informação, o campo fica vazio e é preenchido à mão.
}

const versions = {};
for (const implementation of IMPLEMENTATIONS) {
  const lock = readJson(path.join(workDir(implementation.id), "package-lock.json")).packages;
  const manifest = readJson(path.join(workDir(implementation.id), "package.json"));
  versions[implementation.id] = Object.fromEntries(
    Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
      .sort()
      .map((name) => [name, lock[`node_modules/${name}`]?.version ?? "?"]),
  );
  // Dependência indireta que o capítulo 3 cita.
  if (lock["node_modules/immer"]) versions[implementation.id].immer = lock["node_modules/immer"].version;
}
const measureLock = readJson(path.join(MEASURE_DIR, "package-lock.json")).packages;

const environment = {
  registrado_em: new Date().toISOString(),
  commits,
  alteracoes_sem_commit: dirty.length > 0,
  hardware: {
    processador: os.cpus()[0]?.model.trim(),
    nucleos_logicos: os.cpus().length,
    memoria_gb: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
    armazenamento: storage,
  },
  sistema: { nome: os.version(), versao: os.release(), arquitetura: os.arch() },
  ferramentas: {
    chrome: chromeVersion,
    node: process.version,
    npm: run("npm", ["--version"], { shell: true }),
    lighthouse: measureLock["node_modules/lighthouse"].version,
    "puppeteer-core": measureLock["node_modules/puppeteer-core"].version,
    "chrome-launcher": measureLock["node_modules/chrome-launcher"].version,
  },
  dependencias: versions,
};
fs.writeFileSync(path.join(resultsDir, "ambiente.json"), JSON.stringify(environment, null, 2));
setCurrentResultsDir(resultsDir);

step("Pronto");
console.log("Tamanho do JavaScript (build normal):");
for (const row of bundleRows) {
  console.log(
    `   ${row.implementacao.padEnd(8)} ${String(row.js_bytes).padStart(8)} bytes  (gzip ${row.js_gzip_bytes})`,
  );
}
console.log("Camada de estado:");
for (const row of codeRows) {
  console.log(
    `   ${row.implementacao.padEnd(8)} ${row.linhas_de_codigo} linhas, ${row.funcoes_da_biblioteca} funções da biblioteca, ` +
      `${row.arquivos_de_estado} arquivos, ${row.componentes_acoplados} componentes acoplados`,
  );
}
console.log(`Chrome: ${chromeVersion}`);
console.log(`Resultados em: ${resultsDir}`);
