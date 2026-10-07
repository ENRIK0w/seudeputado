#!/usr/bin/env bash
# Gera dados-base/: malhas municipais simplificadas (uma por UF) e a lista dos
# 5.570 municípios. Origem: malha municipal do IBGE em GeoJSON, publicada em
# https://github.com/luizpedone/municipal-brazilian-geodata. Só precisa rodar de
# novo se o IBGE criar ou alterar municípios.
#
# Uso: scripts/gerar-dados-base.sh [pasta-com-UF.json]
set -euo pipefail

ORIGEM="${1:-$(mktemp -d)}"
DESTINO="$(cd "$(dirname "$0")/.." && pwd)/dados-base"
UFS="AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO"

rm -rf "$DESTINO/malhas" && mkdir -p "$DESTINO/malhas"
for uf in $UFS; do
  arq="$ORIGEM/$uf.json"
  [ -f "$arq" ] || curl -sSf -o "$arq" "https://raw.githubusercontent.com/luizpedone/municipal-brazilian-geodata/master/data/$uf.json"
  # Simplifica mantendo todos os municípios e a vizinhança entre eles (topologia).
  npx --yes mapshaper@0.7 "$arq" \
    -simplify 4% weighted keep-shapes \
    -each "codarea=String(GEOCODIGO), nome=NOME" \
    -filter-fields codarea,nome \
    -o "$DESTINO/malhas/$uf.json" format=geojson precision=0.0001 force
done

# Valida (nenhum município sem geometria) e grava a lista [ibge, nome, uf] por nome.
node -e '
const fs = require("fs"), path = require("path");
const dir = process.argv[1];
const lista = [], vazios = [];
for (const f of fs.readdirSync(path.join(dir, "malhas"))) {
  const uf = f.replace(".json", "");
  for (const ft of JSON.parse(fs.readFileSync(path.join(dir, "malhas", f))).features) {
    if (!ft.geometry || ft.geometry.coordinates.flat(3).length < 8) vazios.push(`${ft.properties.nome}/${uf}`);
    lista.push([ft.properties.codarea, ft.properties.nome, uf]);
  }
}
if (vazios.length) { console.error("Municípios sem geometria: " + vazios.join(", ")); process.exit(1); }
lista.sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
fs.writeFileSync(path.join(dir, "municipios.json"), JSON.stringify(lista));
console.log(lista.length + " municípios, todos com geometria");
' "$DESTINO"
