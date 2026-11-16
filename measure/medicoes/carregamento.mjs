import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { CHROME_PATH, RUN_TIMEOUT_MS } from "../config.mjs";
import { round, withTimeout } from "../apoio/util.mjs";

// Uma rodada do Lighthouse: Chrome e perfil novos, configuração padrão de desktop.
export async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({
    chromePath: CHROME_PATH,
    chromeFlags: ["--headless=new", "--no-first-run", "--disable-extensions"],
  });

  try {
    const result = await withTimeout(
      lighthouse(
        url,
        { port: chrome.port, output: "json", logLevel: "error", onlyCategories: ["performance"] },
        desktopConfig,
      ),
      RUN_TIMEOUT_MS,
      "Lighthouse",
    );
    const { lhr } = result;
    if (lhr.runtimeError) throw new Error(lhr.runtimeError.message);

    const audit = (id) => lhr.audits[id]?.numericValue;

    return {
      lcp_ms: round(audit("largest-contentful-paint"), 2),
      tbt_ms: round(audit("total-blocking-time"), 2),
      fcp_ms: round(audit("first-contentful-paint"), 2),
      si_ms: round(audit("speed-index"), 2),
      cls: round(audit("cumulative-layout-shift"), 4),
      pontuacao: round((lhr.categories.performance.score ?? Number.NaN) * 100, 0),
      lighthouse: lhr.lighthouseVersion,
      chrome: lhr.environment.hostUserAgent.match(/Chrome\/[\d.]+/)?.[0] ?? "",
    };
  } finally {
    await chrome.kill();
  }
}

export const LIGHTHOUSE_COLUMNS = [
  "bloco",
  "ordem",
  "implementacao",
  "tentativa",
  "valido",
  "erro",
  "inicio",
  "lcp_ms",
  "tbt_ms",
  "fcp_ms",
  "si_ms",
  "cls",
  "pontuacao",
  "lighthouse",
  "chrome",
];
