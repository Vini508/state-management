// Coleta das medições. Uso:
//   npm run collect                  coleta completa; retoma de onde parou
//   npm run collect -- --completar   acrescenta blocos até todo grupo ter 30 execuções válidas
//   npm run collect -- --parte=A     só uma parte (A, B ou C)
//   npm run rehearsal                ensaio com 2 blocos, em pasta separada
//   npm run collect -- --smoke       teste rápido do coletor: 1 bloco com execuções curtas
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  BASE_PORT,
  BLOCKS,
  CORE_SENSOR_COUNT,
  DISCARDED_BLOCKS,
  IMPLEMENTATIONS,
  MAX_EXTRA_BLOCKS,
  MEASURED_TICKS,
  PAUSE_BETWEEN_RUNS_MS,
  REHEARSAL_BLOCKS,
  SCALE_SCENARIO,
  SCALE_SENSOR_COUNTS,
  SCENARIOS,
  SHUFFLE_SEED,
  VALID_RUNS_PER_GROUP,
  WARMUP_TICKS,
  profilingOutDir,
  workDir,
} from "../config.mjs";
import { checkResults, printChecks } from "../apoio/conferencias.mjs";
import { LIGHTHOUSE_COLUMNS, runLighthouse } from "../medicoes/carregamento.mjs";
import { RUNTIME_COLUMNS, runOnce } from "../medicoes/execucao.mjs";
import { startPreviews, stopPreviews } from "../apoio/servidores.mjs";
import { appendCsv, currentResultsDir, formatDuration, readCsv, shuffled, sleep } from "../apoio/util.mjs";

const rehearsal = process.argv.includes("--rehearsal");
const complete = process.argv.includes("--completar");
const onlyPart = process.argv.find((arg) => arg.startsWith("--parte="))?.slice("--parte=".length);
// O teste rápido só confere se o coletor funciona; os números dele não servem para nada.
const smoke = process.argv.includes("--smoke");
const trial = rehearsal || smoke;
// --blocos=N só vale no ensaio e no teste rápido; a coleta sempre usa BLOCKS.
const trialBlocks = Number(process.argv.find((arg) => arg.startsWith("--blocos="))?.slice("--blocos=".length));
const blocks = trial && trialBlocks > 0 ? trialBlocks : smoke ? 1 : rehearsal ? REHEARSAL_BLOCKS : BLOCKS;
const measuredTicks = smoke ? 200 : MEASURED_TICKS;
const warmupTicks = smoke ? 50 : WARMUP_TICKS;
const MAX_ATTEMPTS = 2;

const baseDir = currentResultsDir();
const outDir = smoke ? path.join(baseDir, "teste-rapido") : rehearsal ? path.join(baseDir, "ensaio") : baseDir;
if (trial) fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "bruto"), { recursive: true });

const runtimeFile = path.join(outDir, "execucoes.csv");
const lighthouseFile = path.join(outDir, "lighthouse.csv");

function runtimeCombos(part) {
  const combos = [];
  for (const implementation of IMPLEMENTATIONS) {
    if (part === "A") {
      for (const scenario of SCENARIOS) {
        combos.push({ implementation, scenario, sensorCount: CORE_SENSOR_COUNT });
      }
    } else {
      for (const sensorCount of SCALE_SENSOR_COUNTS) {
        combos.push({ implementation, scenario: SCALE_SCENARIO, sensorCount });
      }
    }
  }

  return combos;
}

const PARTS = [
  {
    id: "A",
    title: "Parte A: medições em execução com 1.000 sensores",
    file: runtimeFile,
    columns: RUNTIME_COLUMNS,
    combos: runtimeCombos("A"),
    outDirOf: (combo) => profilingOutDir(combo.sensorCount),
  },
  {
    id: "B",
    title: "Parte B: Lighthouse",
    file: lighthouseFile,
    columns: LIGHTHOUSE_COLUMNS,
    combos: IMPLEMENTATIONS.map((implementation) => ({ implementation })),
    outDirOf: () => "dist",
  },
  {
    id: "C",
    title: "Parte C: extensão de escala (cenário localizado, 100 e 10.000 sensores)",
    file: runtimeFile,
    columns: RUNTIME_COLUMNS,
    combos: runtimeCombos("C"),
    outDirOf: (combo) => profilingOutDir(combo.sensorCount),
  },
];

const identity = (part, block, combo) =>
  part.id === "B"
    ? { bloco: String(block), implementacao: combo.implementation.id }
    : {
        parte: part.id,
        bloco: String(block),
        implementacao: combo.implementation.id,
        cenario: combo.scenario,
        sensores: String(combo.sensorCount),
      };

const matches = (row, id) => Object.entries(id).every(([key, value]) => row[key] === value);

function validCounts(part) {
  const rows = readCsv(part.file).filter(
    (row) => row.valido === "1" && Number(row.bloco) > DISCARDED_BLOCKS,
  );

  return part.combos.map((combo) => {
    const { bloco: _block, ...group } = identity(part, 0, combo);
    return rows.filter((row) => matches(row, group)).length;
  });
}

async function runPart(part, partIndex) {
  console.log(`\n== ${part.title}`);
  // Um servidor por build; os dois cenários de uma versão usam o mesmo.
  const buildOf = (combo) => `${combo.implementation.id}/${part.outDirOf(combo)}`;
  const builds = [...new Set(part.combos.map(buildOf))];
  const servers = await startPreviews(
    builds.map((build, index) => ({
      build,
      appDir: workDir(build.split("/")[0]),
      outDir: build.split("/")[1],
      port: BASE_PORT + partIndex * 20 + index,
    })),
  );
  const urlOf = (combo) => servers.find((server) => server.build === buildOf(combo)).url;
  const durations = [];

  try {
    for (let block = 1; ; block += 1) {
      if (block > blocks) {
        const missing = complete && validCounts(part).some((count) => count < VALID_RUNS_PER_GROUP);
        if (!missing || block > BLOCKS + MAX_EXTRA_BLOCKS) break;
        console.log(`   bloco extra ${block}: algum grupo ainda tem menos de ${VALID_RUNS_PER_GROUP} execuções válidas`);
      }

      const order = shuffled(part.combos, SHUFFLE_SEED + partIndex * 100_000 + block);
      for (const [position, combo] of order.entries()) {
        const id = identity(part, block, combo);
        const attempts = readCsv(part.file).filter((row) => matches(row, id));
        if (attempts.some((row) => row.valido === "1") || attempts.length >= MAX_ATTEMPTS) continue;

        for (let attempt = attempts.length + 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
          const startedAt = Date.now();
          const base = {
            ...id,
            ordem: position + 1,
            tentativa: attempt,
            inicio: new Date(startedAt).toISOString(),
          };
          const label = Object.values(id).slice(part.id === "B" ? 1 : 2).join(" ");
          let succeeded = false;

          try {
            if (part.id === "B") {
              appendCsv(part.file, part.columns, { ...base, valido: 1, ...(await runLighthouse(urlOf(combo))) });
            } else {
              const { row, raw } = await runOnce({
                url: urlOf(combo),
                scenario: combo.scenario,
                sensorCount: combo.sensorCount,
                measuredTicks,
                warmupTicks,
              });
              appendCsv(part.file, part.columns, { ...base, valido: 1, ...row });
              fs.writeFileSync(
                path.join(outDir, "bruto", `${Object.values(id).join("-")}.json.gz`),
                zlib.gzipSync(JSON.stringify({ ...base, ...raw })),
              );
            }
            succeeded = true;
          } catch (error) {
            appendCsv(part.file, part.columns, { ...base, valido: 0, erro: error.message });
            console.log(`   falhou: ${label} (tentativa ${attempt}): ${error.message}`);
          }

          durations.push(Date.now() - startedAt + PAUSE_BETWEEN_RUNS_MS);
          const remaining =
            (Math.max(blocks - block, 0) * part.combos.length + (order.length - position - 1)) *
            (durations.reduce((sum, value) => sum + value, 0) / durations.length);
          console.log(
            `   bloco ${String(block).padStart(2)}/${blocks}  ${String(position + 1).padStart(2)}/${order.length}  ` +
              `${label.padEnd(28)} ${succeeded ? "ok" : "inválida"}  ` +
              `(faltam cerca de ${formatDuration(remaining)} nesta parte)`,
          );
          await sleep(PAUSE_BETWEEN_RUNS_MS);
          if (succeeded) break;
        }
      }
    }
  } finally {
    stopPreviews(servers);
  }
}

const startedAt = Date.now();
console.log(`${smoke ? "Teste rápido" : rehearsal ? "Ensaio" : "Coleta"} em: ${outDir}`);

for (const [index, part] of PARTS.entries()) {
  if (onlyPart && onlyPart.toUpperCase() !== part.id) continue;
  await runPart(part, index);
}

console.log(`\nConcluído em ${formatDuration(Date.now() - startedAt)}.`);

if (trial) {
  const report = checkResults(outDir, { rehearsal: true, required: blocks, measuredTicks });
  printChecks(report);
  process.exit(report.ok ? 0 : 1);
}
console.log('Agora rode "npm run verify".');
