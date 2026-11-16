import path from "node:path";
import { sleep, startProcess } from "./util.mjs";

// Sobe um "vite preview" sobre um build já gerado e espera ele responder.
export async function startPreview(appDir, outDir, port) {
  const child = startProcess(
    process.execPath,
    [
      path.join(appDir, "node_modules", "vite", "bin", "vite.js"),
      "preview",
      "--outDir",
      outDir,
      "--port",
      String(port),
      "--strictPort",
      // No modo profiling o servidor envia os cabeçalhos de isolamento de origem.
      ...(outDir.startsWith("dist-profiling") ? ["--mode", "profiling"] : []),
    ],
    { cwd: appDir },
  );
  const url = `http://localhost:${port}/`;
  let exited = false;
  child.on("exit", () => {
    exited = true;
  });

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (exited) {
      throw new Error(`O servidor de ${outDir} na porta ${port} encerrou. A porta está em uso?`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return { url, stop: () => child.kill() };
    } catch {
      // Ainda subindo.
    }
    await sleep(100);
  }

  child.kill();
  throw new Error(`O servidor de ${outDir} na porta ${port} não respondeu.`);
}

export async function startPreviews(entries) {
  const servers = [];

  try {
    for (const entry of entries) {
      servers.push({ ...entry, ...(await startPreview(entry.appDir, entry.outDir, entry.port)) });
    }
  } catch (error) {
    stopPreviews(servers);
    throw error;
  }

  return servers;
}

export function stopPreviews(servers) {
  for (const server of servers) server.stop();
}
