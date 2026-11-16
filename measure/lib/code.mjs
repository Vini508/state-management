import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

// Contagens sobre o código e o build de cada implementação.
// As regras estão em Docs/plano-medicao.md, seções 2.1 e 9.1.

const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /\.test\.tsx?$/;
// Apoio ao teste de renderizações; não faz parte da camada de estado.
const EXCLUDED_STATE_FILES = new Set(["renderExpectations.ts"]);

function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

export function stateFiles(appDir) {
  return listFiles(path.join(appDir, "src", "state")).filter(
    (file) =>
      SOURCE_FILE.test(file) &&
      !TEST_FILE.test(file) &&
      !EXCLUDED_STATE_FILES.has(path.basename(file)),
  );
}

// Linhas que não são em branco nem só comentário.
export function countCodeLines(source) {
  let inBlockComment = false;
  let count = 0;

  for (const line of source.split(/\r?\n/)) {
    let rest = line;
    let code = "";

    while (rest.length > 0) {
      if (inBlockComment) {
        const end = rest.indexOf("*/");
        if (end === -1) {
          rest = "";
        } else {
          rest = rest.slice(end + 2);
          inBlockComment = false;
        }
        continue;
      }

      const block = rest.indexOf("/*");
      const lineComment = rest.indexOf("//");
      if (lineComment !== -1 && (block === -1 || lineComment < block)) {
        code += rest.slice(0, lineComment);
        rest = "";
      } else if (block !== -1) {
        code += rest.slice(0, block);
        rest = rest.slice(block + 2);
        inBlockComment = true;
      } else {
        code += rest;
        rest = "";
      }
    }

    if (code.trim().length > 0) count += 1;
  }

  return count;
}

// Devolve [{ source, names }] para cada import; ignora importações só de tipo.
export function parseImports(source) {
  const imports = [];
  const pattern = /import\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g;

  for (const match of source.matchAll(pattern)) {
    const [, typeOnly, clause, from] = match;
    if (typeOnly) {
      imports.push({ source: from, names: [] });
      continue;
    }

    const names = [];
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const name = part.trim();
        if (name.length === 0 || name.startsWith("type ")) continue;
        names.push(name.split(/\s+as\s+/)[0]);
      }
    }
    const outside = clause.replace(/\{[^}]*\}/, "").replace(/,/g, " ").trim();
    if (outside.length > 0) names.push(outside.replace(/^\*\s+as\s+/, ""));

    imports.push({ source: from, names });
  }

  return imports;
}

export function measureCode(appDir, implementation) {
  const files = stateFiles(appDir);
  const libraryFunctions = new Set();
  let lines = 0;

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    lines += countCodeLines(source);
    for (const entry of parseImports(source)) {
      if (!implementation.packages.includes(entry.source)) continue;
      for (const name of entry.names) libraryFunctions.add(name);
    }
  }

  // Componentes que importam um pacote de estado ou um arquivo interno de src/state.
  const componentFiles = [
    ...listFiles(path.join(appDir, "src", "components")),
    path.join(appDir, "src", "App.tsx"),
    path.join(appDir, "src", "main.tsx"),
  ].filter((file) => SOURCE_FILE.test(file) && !TEST_FILE.test(file));
  const coupledComponents = componentFiles.filter((file) =>
    parseImports(fs.readFileSync(file, "utf8")).some(
      (entry) =>
        implementation.statePackages.includes(entry.source) || /(^|\/)state\/.+/.test(entry.source),
    ),
  );

  return {
    arquivos_de_estado: files.length,
    linhas_de_codigo: lines,
    funcoes_da_biblioteca: libraryFunctions.size,
    componentes_acoplados: coupledComponents.length,
    detalhe: {
      arquivos: files.map((file) => path.relative(appDir, file).replaceAll("\\", "/")),
      funcoes: [...libraryFunctions].sort(),
      componentes: coupledComponents.map((file) => path.relative(appDir, file).replaceAll("\\", "/")),
    },
  };
}

export function measureBundle(appDir, outDir) {
  const assets = path.join(appDir, outDir, "assets");
  const sizes = { js_bytes: 0, js_gzip_bytes: 0, css_bytes: 0, css_gzip_bytes: 0 };

  for (const name of fs.readdirSync(assets)) {
    const content = fs.readFileSync(path.join(assets, name));
    const kind = name.endsWith(".js") ? "js" : name.endsWith(".css") ? "css" : null;
    if (!kind) continue;
    sizes[`${kind}_bytes`] += content.length;
    sizes[`${kind}_gzip_bytes`] += zlib.gzipSync(content, { level: 9 }).length;
  }

  return sizes;
}
