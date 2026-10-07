/** URL de um arquivo em public/data/ (baixado pelo navegador). */
export const urlDados = (caminho: string) => `/data/${caminho.replace(/^\//, "")}`;
