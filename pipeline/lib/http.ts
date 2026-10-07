import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.resolve(process.env.PIPELINE_CACHE ?? ".cache");
const USER_AGENT = "SeuDeputado/0.1 (+https://github.com/enrik0w/seudeputado)";

function cachePath(url: string, ext: string) {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  const name = url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 80);
  return path.join(CACHE_DIR, `${name}_${hash}${ext}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, init: RequestInit = {}, tentativas = 5): Promise<Response> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init.headers },
        redirect: "follow",
      });
      if (res.ok) return res;
      // 404 é definitivo; 429/5xx valem nova tentativa.
      if (res.status === 404) throw new HttpError(url, res.status);
      ultimoErro = new HttpError(url, res.status);
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) throw e;
      ultimoErro = e;
    }
    await sleep(1000 * 2 ** i);
  }
  throw ultimoErro;
}

export class HttpError extends Error {
  constructor(
    public url: string,
    public status: number,
  ) {
    super(`HTTP ${status} em ${url}`);
  }
}

export interface CacheOpts {
  /** Reaproveita o cache se tiver menos que esta idade (horas). Padrão: 20h. */
  maxIdadeHoras?: number;
}

async function cacheValido(file: string, maxIdadeHoras: number) {
  if (!existsSync(file)) return false;
  const { mtimeMs } = await import("node:fs").then((fs) => fs.statSync(file));
  return Date.now() - mtimeMs < maxIdadeHoras * 3600_000;
}

/** GET de JSON com cache em disco. */
export async function getJson<T = unknown>(url: string, opts: CacheOpts = {}): Promise<T> {
  const file = cachePath(url, ".json");
  if (await cacheValido(file, opts.maxIdadeHoras ?? 20)) {
    return JSON.parse(await readFile(file, "utf8")) as T;
  }
  const res = await fetchWithRetry(url);
  const text = await res.text();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, text);
  return JSON.parse(text) as T;
}

/** Baixa um arquivo binário (ZIP/CSV) com cache em disco. Retorna o caminho local. */
export async function download(url: string, opts: CacheOpts = {}): Promise<string> {
  const ext = path.extname(new URL(url).pathname) || ".bin";
  const file = cachePath(url, ext);
  if (await cacheValido(file, opts.maxIdadeHoras ?? 20)) return file;
  console.log(`  ↓ ${url}`);
  const res = await fetchWithRetry(url, { headers: { Accept: "*/*" } });
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, buf);
  return file;
}

/** Executa `fn` sobre `itens` com no máximo `limite` em paralelo. */
export async function emParalelo<T, R>(itens: T[], limite: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  async function worker() {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, worker));
  return resultados;
}
