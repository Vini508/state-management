import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { MEASURE_DIR, RESULTS_DIR } from "../config.mjs";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`tempo esgotado: ${label}`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Executa um comando até o fim e devolve a saída; falha com a mensagem do comando.
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `"${command} ${args.join(" ")}" falhou (código ${result.status}):\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout.trim();
}

export function startProcess(command, args, options = {}) {
  return spawn(command, args, { stdio: "ignore", ...options });
}

// --- Sorteio reproduzível ---

function mulberry32(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(items, seed) {
  const random = mulberry32(seed);
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }

  return result;
}

// --- Estatística por execução ---

export function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentile(values, fraction) {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function round(value, digits = 4) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : "";
}

export function checksum(values) {
  return createHash("sha1").update(values.join(",")).digest("hex").slice(0, 12);
}

// --- CSV simples: os valores gravados nunca contêm vírgula nem aspas ---

function clean(value) {
  return String(value ?? "").replace(/[,\r\n"]+/g, " ").trim();
}

export function appendCsv(file, columns, row) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, `${columns.join(",")}\n`);
  fs.appendFileSync(file, `${columns.map((column) => clean(row[column])).join(",")}\n`);
}

export function writeCsv(file, columns, rows) {
  const lines = rows.map((row) => columns.map((column) => clean(row[column])).join(","));
  fs.writeFileSync(file, `${[columns.join(","), ...lines].join("\n")}\n`);
}

export function readCsv(file) {
  if (!fs.existsSync(file)) return [];
  const [header, ...lines] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const columns = header.split(",");

  return lines
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = line.split(",");
      return Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ""]));
    });
}

// --- Pasta de resultados em uso ---

const CURRENT_FILE = path.join(MEASURE_DIR, ".current");

export function setCurrentResultsDir(dir) {
  fs.writeFileSync(CURRENT_FILE, path.basename(dir));
}

export function currentResultsDir() {
  const fromArgs = process.argv.find((arg) => arg.startsWith("--dir="));
  const name = fromArgs
    ? fromArgs.slice("--dir=".length)
    : fs.existsSync(CURRENT_FILE) && fs.readFileSync(CURRENT_FILE, "utf8").trim();
  if (!name) {
    throw new Error('Nenhuma pasta de resultados em uso. Rode "npm run setup" primeiro.');
  }

  const dir = path.isAbsolute(name) ? name : path.join(RESULTS_DIR, name);
  if (!fs.existsSync(dir)) throw new Error(`Pasta de resultados não encontrada: ${dir}`);

  return dir;
}

export function timestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

export function formatDuration(ms) {
  const minutes = Math.round(ms / 60_000);

  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
