import type { ProfilerOnRenderCallback } from "react";

// Instrumentação de medição. Fica desligada no uso normal e só é ativada
// quando a página é aberta com ?ticks=N (e, opcionalmente, &warmup=M):
// as M primeiras atualizações rodam sem registro, as N seguintes são medidas
// e a simulação é pausada ao fim delas.

export interface MeasurementResult {
  warmupTicks: number;
  measuredTicks: number;
  // Tempo de cada atualização medida, da chamada ao retorno.
  tickDurationsMs: number[];
  // Do início da primeira atualização medida ao fim da última.
  totalDurationMs: number;
  // Intervalo entre frames consecutivos durante as atualizações medidas.
  frameIntervalsMs: number[];
  // Renderizações informadas pelo <Profiler> (só no build de profiling).
  renderCount: number;
  renderDurationMs: number;
  // Tarefas acima de 50 ms e o quanto elas passaram desse limite.
  longTaskCount: number;
  longTaskBlockingMs: number;
  crossOriginIsolated: boolean;
}

export interface Measurement {
  // Registra uma atualização; devolve true quando a medição terminou.
  recordTick(startMs: number, endMs: number): boolean;
  recordRender(durationMs: number): void;
  // Resolve no início da primeira atualização medida.
  readonly started: Promise<void>;
  readonly finished: Promise<MeasurementResult>;
}

const LONG_TASK_LIMIT_MS = 50;
// Folga para execuções lentas: a 60 Hz, cinco minutos de frames.
const MAX_FRAMES = 18_000;

export function createMeasurement(measuredTicks: number, warmupTicks: number): Measurement {
  // Memória reservada antes de medir, para o registro não gerar coleta de lixo.
  const tickDurations = new Float64Array(measuredTicks);
  const frameIntervals = new Float64Array(MAX_FRAMES);
  let tickCount = 0;
  let frameCount = 0;
  let lastFrameMs = 0;
  let frameRequest = 0;
  let windowStartMs = 0;
  let measuring = false;
  let done = false;
  let renderCount = 0;
  let renderDurationMs = 0;
  let longTaskCount = 0;
  let longTaskBlockingMs = 0;

  let resolveStarted: () => void = () => undefined;
  let resolveFinished: (result: MeasurementResult) => void = () => undefined;
  const started = new Promise<void>((resolve) => {
    resolveStarted = resolve;
  });
  const finished = new Promise<MeasurementResult>((resolve) => {
    resolveFinished = resolve;
  });

  const recordLongTasks = (entries: PerformanceEntryList) => {
    for (const entry of entries) {
      if (entry.startTime < windowStartMs) continue;
      longTaskCount += 1;
      longTaskBlockingMs += entry.duration - LONG_TASK_LIMIT_MS;
    }
  };
  const longTaskObserver = supportsLongTasks()
    ? new PerformanceObserver((list) => recordLongTasks(list.getEntries()))
    : null;

  const onFrame = (nowMs: number) => {
    if (!measuring) return;
    if (lastFrameMs > 0 && frameCount < MAX_FRAMES) {
      frameIntervals[frameCount] = nowMs - lastFrameMs;
      frameCount += 1;
    }
    lastFrameMs = nowMs;
    frameRequest = requestAnimationFrame(onFrame);
  };

  const begin = (startMs: number) => {
    windowStartMs = startMs;
    measuring = true;
    longTaskObserver?.observe({ type: "longtask" });
    if (typeof requestAnimationFrame === "function") {
      frameRequest = requestAnimationFrame(onFrame);
    }
    resolveStarted();
  };

  const finish = (endMs: number) => {
    measuring = false;
    done = true;
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frameRequest);
    if (longTaskObserver) {
      recordLongTasks(longTaskObserver.takeRecords());
      longTaskObserver.disconnect();
    }

    resolveFinished({
      warmupTicks,
      measuredTicks,
      tickDurationsMs: Array.from(tickDurations),
      totalDurationMs: endMs - windowStartMs,
      frameIntervalsMs: Array.from(frameIntervals.subarray(0, frameCount)),
      renderCount,
      renderDurationMs,
      longTaskCount,
      longTaskBlockingMs,
      crossOriginIsolated: globalThis.crossOriginIsolated === true,
    });
  };

  return {
    started,
    finished,
    recordTick(startMs, endMs) {
      if (done) return true;

      const measuredIndex = tickCount - warmupTicks;
      tickCount += 1;
      if (measuredIndex < 0) return false;
      if (measuredIndex === 0) begin(startMs);

      tickDurations[measuredIndex] = endMs - startMs;
      if (measuredIndex < measuredTicks - 1) return false;

      finish(endMs);
      return true;
    },
    recordRender(durationMs) {
      if (!measuring) return;
      renderCount += 1;
      renderDurationMs += durationMs;
    },
  };
}

function supportsLongTasks(): boolean {
  return (
    typeof PerformanceObserver === "function" &&
    (PerformanceObserver.supportedEntryTypes ?? []).includes("longtask")
  );
}

function readCount(value: string | null): number {
  const count = Number(value);

  return Number.isInteger(count) && count > 0 ? count : 0;
}

function readMeasurement(): Measurement | null {
  const params = new URLSearchParams(window.location.search);
  const measuredTicks = readCount(params.get("ticks"));

  return measuredTicks > 0
    ? createMeasurement(measuredTicks, readCount(params.get("warmup")))
    : null;
}

declare global {
  interface Window {
    // Lido pelo coletor de medição (pasta measure/).
    __measurement?: Measurement;
  }
}

export const measurement = readMeasurement();

if (measurement) {
  window.__measurement = measurement;
}

export const onAppRender: ProfilerOnRenderCallback = (_id, _phase, actualDuration) => {
  measurement?.recordRender(actualDuration);
};
