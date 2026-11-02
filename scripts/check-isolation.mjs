// Garante que um branch de técnica altera apenas a camada de estado em
// relação ao branch base. Uso: npm run check:isolation [-- <branch-base>]
import { execFileSync } from "node:child_process";

const BASE = process.argv[2] ?? "main";
const ALLOWED = [/^src\/state\//, /^package\.json$/, /^package-lock\.json$/];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function lines(output) {
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch === BASE) {
  console.log(`"${BASE}" é o branch base; nada a verificar.`);
  process.exit(0);
}

const changed = new Set([
  ...lines(git("diff", "--name-only", `${BASE}...HEAD`)),
  ...lines(git("diff", "--name-only", "HEAD")),
  ...lines(git("ls-files", "--others", "--exclude-standard")),
]);

const violations = [...changed].filter(
  (file) => !ALLOWED.some((pattern) => pattern.test(file)),
);

if (violations.length > 0) {
  console.error(`"${branch}" altera arquivos fora da camada de estado em relação a "${BASE}":`);
  for (const file of violations) console.error(`  - ${file}`);
  console.error("Mova essas mudanças para o branch base e faça merge dele neste branch.");
  process.exit(1);
}

console.log(`OK: "${branch}" altera apenas src/state/, package.json e package-lock.json.`);
