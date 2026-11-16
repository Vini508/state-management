import path from "node:path";
import {
  DISCARDED_BLOCKS,
  IMPLEMENTATIONS,
  MEASURED_TICKS,
  REHEARSAL_BLOCKS,
  SCALE_SENSOR_COUNTS,
  SCENARIOS,
  VALID_RUNS_PER_GROUP,
} from "../config.mjs";
import { percentile, readCsv } from "./util.mjs";

const isValid = (row) => row.valido === "1";
const versionOf = (text) => text.match(/\d+(\.\d+)+/)?.[0] ?? text;

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);

  return counts;
}

function expectedRuntimeGroups(hasScale) {
  const groups = [];
  for (const { id } of IMPLEMENTATIONS) {
    for (const scenario of SCENARIOS) groups.push(`A|${id}|${scenario}|1000`);
    if (hasScale) {
      for (const sensors of SCALE_SENSOR_COUNTS) groups.push(`C|${id}|localized|${sensors}`);
    }
  }

  return groups;
}

// Confere os dados de uma pasta de resultados. No ensaio, todo bloco conta;
// na coleta, o bloco de aquecimento fica de fora.
export function checkResults(
  dir,
  { rehearsal = false, required = rehearsal ? REHEARSAL_BLOCKS : VALID_RUNS_PER_GROUP, measuredTicks = MEASURED_TICKS } = {},
) {
  const firstBlock = rehearsal ? 1 : DISCARDED_BLOCKS + 1;
  const counted = (row) => Number(row.bloco) >= firstBlock;

  const runtimeAll = readCsv(path.join(dir, "execucoes.csv"));
  const runtime = runtimeAll.filter(isValid);
  const lighthouseAll = readCsv(path.join(dir, "lighthouse.csv"));
  const lighthouse = lighthouseAll.filter(isValid);
  const hasScale = runtimeAll.some((row) => row.parte === "C");
  const checks = [];
  const add = (nome, ok, detalhe = "") => checks.push({ nome, ok, detalhe });

  const groupKey = (row) => `${row.parte}|${row.implementacao}|${row.cenario}|${row.sensores}`;
  const runtimeCounts = countBy(runtime.filter(counted), groupKey);
  const shortRuntime = expectedRuntimeGroups(hasScale)
    .map((group) => [group, runtimeCounts.get(group) ?? 0])
    .filter(([, count]) => count < required);
  add(
    `Execuções válidas por grupo (${required} em cada)`,
    shortRuntime.length === 0,
    shortRuntime.map(([group, count]) => `${group}: ${count}`).join("; "),
  );

  const lighthouseCounts = countBy(lighthouse.filter(counted), (row) => row.implementacao);
  const shortLighthouse = IMPLEMENTATIONS.map(({ id }) => [id, lighthouseCounts.get(id) ?? 0]).filter(
    ([, count]) => count < required,
  );
  add(
    `Rodadas válidas do Lighthouse por implementação (${required} em cada)`,
    shortLighthouse.length === 0,
    shortLighthouse.map(([id, count]) => `${id}: ${count}`).join("; "),
  );

  const wrongTicks = runtime.filter(
    (row) => Number(row.atualizacoes) !== measuredTicks || row.pausou !== "1",
  );
  add(
    `${measuredTicks} atualizações registradas e pausa automática em todas as execuções`,
    runtime.length > 0 && wrongTicks.length === 0,
    wrongTicks.length > 0 ? `${wrongTicks.length} execuções fora do esperado` : "",
  );

  const coarseClock = runtime.filter((row) => row.relogio_preciso !== "1");
  add(
    "Relógio de alta precisão ativo",
    runtime.length > 0 && coarseClock.length === 0,
    coarseClock.length > 0 ? `${coarseClock.length} execuções sem isolamento de origem` : "",
  );

  const badGrid = runtime.filter((row) => row.grade_ok !== "1" || row.cartoes !== row.sensores);
  add(
    "Grade completa e visível, com um cartão por sensor",
    runtime.length > 0 && badGrid.length === 0,
    badGrid.length > 0 ? `${badGrid.length} execuções com a grade fora do esperado` : "",
  );

  const checksums = new Map();
  for (const row of runtime) {
    const key = `${row.parte} ${row.cenario} ${row.sensores}`;
    checksums.set(key, (checksums.get(key) ?? new Set()).add(row.checksum));
  }
  const diverging = [...checksums].filter(([, values]) => values.size > 1).map(([key]) => key);
  add(
    "Valores finais dos sensores iguais nas quatro versões, em cada cenário",
    runtime.length > 0 && diverging.length === 0,
    diverging.join("; "),
  );

  const noRenders = runtime.filter((row) => Number(row.renderizacoes) <= 0);
  add(
    "Renderizações do <Profiler> registradas",
    runtime.length > 0 && noRenders.length === 0,
    noRenders.length > 0 ? `${noRenders.length} execuções sem renderizações (build normal em uso?)` : "",
  );

  const frameMedian = percentile(
    runtime.map((row) => Number(row.frame_mediana_ms)).filter(Number.isFinite),
    0.5,
  );
  add(
    "Navegador desenhando a cerca de 60 quadros por segundo",
    frameMedian > 15 && frameMedian < 18.5,
    `mediana do intervalo entre quadros: ${frameMedian.toFixed(2)} ms`,
  );

  const missingMetrics = lighthouse.filter(
    (row) => !Number.isFinite(Number(row.lcp_ms)) || row.lcp_ms === "" || row.tbt_ms === "",
  );
  add(
    "LCP e TBT presentes em todas as rodadas do Lighthouse",
    lighthouse.length > 0 && missingMetrics.length === 0,
    missingMetrics.length > 0 ? `${missingMetrics.length} rodadas sem LCP ou TBT` : "",
  );

  // O Lighthouse só informa a versão principal do Chrome (o navegador reduz o
  // restante no user agent), então as duas fontes são comparadas por ela.
  const runtimeChrome = new Set(runtime.map((row) => versionOf(row.chrome)));
  const lighthouseChrome = new Set(lighthouse.map((row) => versionOf(row.chrome)));
  const majors = new Set([...runtimeChrome, ...lighthouseChrome].map((version) => version.split(".")[0]));
  add(
    "Mesma versão do Chrome em tudo",
    runtimeChrome.size <= 1 && lighthouseChrome.size <= 1 && majors.size === 1,
    [...runtimeChrome, ...lighthouseChrome].join(", "),
  );

  const failures = [...runtimeAll, ...lighthouseAll].filter((row) => !isValid(row));
  add(
    rehearsal ? "Nenhuma tentativa falhou" : "Tentativas que falharam (informativo)",
    rehearsal ? failures.length === 0 : true,
    failures.length > 0
      ? `${failures.length}: ${[...new Set(failures.map((row) => row.erro))].join(" | ")}`
      : "",
  );

  return { checks, ok: checks.every((check) => check.ok), hasScale };
}

export function printChecks({ checks, ok, hasScale }) {
  console.log("");
  for (const check of checks) {
    console.log(`${check.ok ? "[ok]    " : "[FALHOU]"} ${check.nome}${check.detalhe ? ` (${check.detalhe})` : ""}`);
  }
  if (!hasScale) console.log("[aviso]  A parte C (extensão de escala) não está nestes dados.");
  console.log(ok ? "\nTodas as conferências aprovadas." : "\nHá conferências reprovadas. Não siga adiante.");
}
