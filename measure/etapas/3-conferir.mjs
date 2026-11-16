// Confere a integridade dos dados coletados. Uso: npm run verify
//   npm run verify -- --rehearsal   confere os dados do ensaio
import path from "node:path";
import { checkResults, printChecks } from "../apoio/conferencias.mjs";
import { currentResultsDir } from "../apoio/util.mjs";

const rehearsal = process.argv.includes("--rehearsal");
const dir = rehearsal ? path.join(currentResultsDir(), "ensaio") : currentResultsDir();

console.log(`Conferindo: ${dir}`);
const report = checkResults(dir, { rehearsal });
printChecks(report);
process.exit(report.ok ? 0 : 1);
