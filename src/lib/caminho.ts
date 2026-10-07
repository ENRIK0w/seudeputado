/** Prefixa caminhos de arquivos em public/ com o basePath (necessário para fetch no GitHub Pages). */
export const BASE = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
export const urlDados = (caminho: string) => `${BASE}/data/${caminho.replace(/^\//, "")}`;
