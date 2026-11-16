import puppeteer from "puppeteer-core";
import {
  CHROME_PATH,
  LATE_FRAME_MS,
  MEASURED_TICKS,
  RUN_TIMEOUT_MS,
  VIEWPORT,
  WARMUP_TICKS,
  gridColumns,
} from "../config.mjs";
import { checksum, mean, percentile, round, withTimeout } from "../apoio/util.mjs";

const MB = 1024 * 1024;

async function heapAfterGc(page, cdp) {
  await cdp.send("HeapProfiler.collectGarbage");

  return (await page.metrics()).JSHeapUsedSize;
}

// Uma execução: Chrome e perfil novos, carga completa, leitura das medidas.
export async function runOnce({
  url,
  scenario,
  sensorCount,
  measuredTicks = MEASURED_TICKS,
  warmupTicks = WARMUP_TICKS,
}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    // O limite de cada execução é o RUN_TIMEOUT_MS; o do protocolo fica acima dele.
    protocolTimeout: RUN_TIMEOUT_MS + 60_000,
    defaultViewport: { ...VIEWPORT, deviceScaleFactor: 1 },
    args: [`--window-size=${VIEWPORT.width},${VIEWPORT.height}`, "--no-first-run"],
  });

  try {
    const page = await browser.newPage();
    const cdp = await page.createCDPSession();
    await cdp.send("HeapProfiler.enable");
    await page.goto(`${url}?ticks=${measuredTicks}&warmup=${warmupTicks}`, {
      waitUntil: "load",
    });
    await page.waitForSelector(".sensor-card");
    if (scenario !== "simultaneous") await page.select("select", scenario);

    const heapStart = await heapAfterGc(page, cdp);
    await page.click(".button--primary");

    // As métricas do Chrome são lidas no início e no fim das atualizações medidas.
    await withTimeout(
      page.evaluate(() => window.__measurement.started),
      RUN_TIMEOUT_MS,
      "início da medição",
    );
    const before = await page.metrics();
    const result = await withTimeout(
      page.evaluate(() => window.__measurement.finished),
      RUN_TIMEOUT_MS,
      "fim da medição",
    );
    const after = await page.metrics();

    // Dois frames para o React aplicar a última atualização antes de ler a tela.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const heapEnd = await heapAfterGc(page, cdp);
    const dom = await page.evaluate(() => {
      const grid = document.querySelector(".sensor-grid");
      const cards = [...document.querySelectorAll(".sensor-card")];
      const last = cards.at(-1).getBoundingClientRect();

      return {
        values: cards.map((card) => card.textContent),
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        allVisible: last.bottom <= window.innerHeight && last.right <= window.innerWidth,
        runState: document.querySelector(".run-state").textContent,
      };
    });

    const ticks = result.tickDurationsMs;
    const frames = result.frameIntervalsMs;
    const threadMs = (after.TaskDuration - before.TaskDuration) * 1000;
    const lateFrames = frames.filter((interval) => interval > LATE_FRAME_MS).length;

    return {
      row: {
        atualizacoes: ticks.length,
        tick_medio_ms: round(mean(ticks), 6),
        tick_mediana_ms: round(percentile(ticks, 0.5), 6),
        tick_p95_ms: round(percentile(ticks, 0.95), 6),
        tick_max_ms: round(Math.max(...ticks), 4),
        duracao_total_ms: round(result.totalDurationMs, 2),
        thread_ms: round(threadMs, 2),
        thread_por_atualizacao_ms: round(threadMs / ticks.length, 5),
        script_ms: round((after.ScriptDuration - before.ScriptDuration) * 1000, 2),
        layout_ms: round((after.LayoutDuration - before.LayoutDuration) * 1000, 2),
        estilo_ms: round((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000, 2),
        render_total_ms: round(result.renderDurationMs, 2),
        renderizacoes: result.renderCount,
        render_medio_ms:
          result.renderCount > 0 ? round(result.renderDurationMs / result.renderCount, 5) : "",
        frames: frames.length,
        frame_mediana_ms: round(percentile(frames, 0.5), 3),
        frame_p95_ms: round(percentile(frames, 0.95), 3),
        frames_atrasados_pct:
          frames.length > 0 ? round((100 * lateFrames) / frames.length, 3) : "",
        tarefas_longas: result.longTaskCount,
        bloqueio_ms: round(result.longTaskBlockingMs, 2),
        heap_inicial_mb: round(heapStart / MB, 3),
        heap_final_mb: round(heapEnd / MB, 3),
        relogio_preciso: result.crossOriginIsolated ? 1 : 0,
        grade_ok: dom.columns === gridColumns(sensorCount) && dom.allVisible ? 1 : 0,
        pausou: dom.runState === "Pausada" ? 1 : 0,
        cartoes: dom.values.length,
        checksum: checksum(dom.values),
        chrome: await browser.version(),
      },
      raw: {
        tickDurationsMs: ticks.map((value) => round(value, 4)),
        frameIntervalsMs: frames.map((value) => round(value, 3)),
      },
    };
  } finally {
    await browser.close();
  }
}

export const RUNTIME_COLUMNS = [
  "parte",
  "bloco",
  "ordem",
  "implementacao",
  "cenario",
  "sensores",
  "tentativa",
  "valido",
  "erro",
  "inicio",
  "atualizacoes",
  "tick_medio_ms",
  "tick_mediana_ms",
  "tick_p95_ms",
  "tick_max_ms",
  "duracao_total_ms",
  "thread_ms",
  "thread_por_atualizacao_ms",
  "script_ms",
  "layout_ms",
  "estilo_ms",
  "render_total_ms",
  "renderizacoes",
  "render_medio_ms",
  "frames",
  "frame_mediana_ms",
  "frame_p95_ms",
  "frames_atrasados_pct",
  "tarefas_longas",
  "bloqueio_ms",
  "heap_inicial_mb",
  "heap_final_mb",
  "relogio_preciso",
  "grade_ok",
  "pausou",
  "cartoes",
  "checksum",
  "chrome",
];
