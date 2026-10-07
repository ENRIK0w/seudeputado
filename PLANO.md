# Seu Deputado — Plano do projeto

Dossiê aberto de cada parlamentar: como votou, o que apresentou, quanto gastou,
para onde mandou emendas, por quais partidos passou e onde foi votado.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Escopo do MVP | Câmara dos Deputados (513) + Senado (81). Assembleias estaduais depois, estado por estado. |
| Histórico | Legislatura atual (57ª, 2023–2027). Eleições usadas no mapa: 2022 (deputados) e 2018/2022 (senadores). |
| Público | Cidadão comum: mobile-first, linguagem simples. |
| Postura | Neutra — só dados, sem notas nem rótulos de "bom/ruim". |
| Visual | Inspirado no seuimposto.com: tema escuro, títulos em serifa, cards arredondados, abas em pílula, números grandes, mapas coropléticos e hemiciclo de bolinhas. |
| Atualização | 1× por dia (madrugada). |
| Nome/domínio | "Seu Deputado" provisório; subdomínio grátis até decidir. |

## Arquitetura (custo zero)

Não usamos banco de dados. As APIs públicas são lentas, têm limite de
requisições, e boa parte dos dados (TSE, emendas, cota parlamentar) só existe
como **arquivo CSV/ZIP para download**, não como API. Além disso, métricas como
fidelidade partidária exigem cruzar milhares de votações. Então:

```
GitHub Actions (cron diário)
  └─ pipeline/ (Node + TypeScript)
       1. baixa os dados das fontes oficiais (com cache)
       2. normaliza e cruza (deputado ↔ candidato TSE ↔ emendas)
       3. calcula métricas (fidelidade, alinhamento, participação)
       4. grava JSON em data/ (build) e public/data/ (consulta no navegador)
  └─ next build (output: "export") → HTML estático
  └─ deploy no GitHub Pages (ou Cloudflare Pages)
```

- **Next.js 16** com export estático: uma página HTML por parlamentar, gerada no build.
- **JSON estático** para dados grandes ou sob demanda (todos os votos, mapa por município, dados de cada cidade).
- **Busca por CEP** feita no navegador: ViaCEP → código IBGE do município → `public/data/municipios/{ibge}.json`.
- **Gráficos**: SVG próprio + `d3-geo` para mapas (malhas do IBGE).
- Custo: R$ 0 (GitHub Actions + Pages). Se o volume crescer, Cloudflare Pages/R2 continuam grátis.

## Fontes de dados

| Dado | Fonte | Formato |
|---|---|---|
| Deputados, histórico de partido/status | API Câmara `dadosabertos.camara.leg.br/api/v2` | JSON |
| Votações, votos, orientações de bancada | Arquivos anuais da Câmara (`/arquivos/votacoes*`) | JSON |
| Proposições e autores | Arquivos anuais da Câmara (`/arquivos/proposicoes*`) | JSON |
| Tramitação (linha do tempo do projeto) | API Câmara `/proposicoes/{id}/tramitacoes` | JSON |
| Cota parlamentar (CEAP) — Câmara | `camara.leg.br/cotas/Ano-AAAA.json.zip` | ZIP/JSON |
| Senadores, filiações, votações, autorias | API Senado `legis.senado.leg.br/dadosabertos` | JSON |
| Cota parlamentar (CEAPS) — Senado | `senado.leg.br/transparencia/LAI/verba/despesa_ceaps_AAAA.csv` | CSV |
| Votos por município, candidatos, bens, receitas | TSE `cdn.tse.jus.br/estatistica/sead/odsele` | ZIP/CSV |
| Emendas parlamentares (valor, município, pago) | Portal da Transparência (download) | ZIP/CSV |
| Municípios e malhas (mapas) | IBGE `servicodados.ibge.gov.br` | JSON/GeoJSON |
| CEP → município | ViaCEP (no navegador) | JSON |

### Cruzamentos

- **Deputado ↔ TSE**: pelo CPF (a API da Câmara informa; o TSE também).
- **Senador ↔ TSE**: nome + UF + cargo (o Senado não publica CPF).
- **Emendas ↔ parlamentar**: nome do autor normalizado + casa.
- **Município TSE ↔ IBGE**: nome normalizado + UF.

## Funcionalidades

Legenda: ✅ pronto e testado com dados de exemplo · 🔶 código pronto, falta validar na
primeira execução com dados reais · ⬜ a fazer

### Fase 1 — MVP
- ✅ Plano e estrutura do projeto
- 🔶 Pipeline Câmara: deputados, histórico de partidos, votações, votos, orientações, proposições, cota parlamentar
- 🔶 Pipeline Senado: senadores, filiações, votações, autorias, cota parlamentar
- ✅ Métricas: fidelidade partidária, alinhamento com o governo, participação nas votações
- ✅ Home: busca, composição por partido (hemiciclo + Esquerda/Centro/Direita), últimas votações
- ✅ Lista de parlamentares com filtros (casa, UF, partido, ordenação)
- ✅ Perfil: resumo, métricas, mapa de votos, partidos, proposições, gastos, emendas
- ✅ Página de votação: placar, orientações, votos por partido, voto a voto
- 🔶 Atualização diária + deploy no GitHub Pages (workflow pronto; falta ativar o Pages)

### Fase 2
- 🔶 **Mapa de calor eleitoral** por município (TSE + malha IBGE) — UI pronta
- 🔶 **Emendas**: quanto, para onde, quando, empenhado × pago — UI pronta
- 🔶 **Busca por CEP/cidade** — UI pronta (ViaCEP no navegador)
- 🔶 Patrimônio declarado — evolução entre eleições ⬜
- ⬜ Doadores de campanha (arquivo do TSE tem vários GB; processar à parte)
- ⬜ Linha do tempo de tramitação de cada projeto
- ⬜ **Cards de compartilhamento** (imagem por parlamentar/votação para WhatsApp/Instagram)
- ⬜ Fotos reais otimizadas, modo claro, página por partido

### Fase 3
- [ ] Assembleias estaduais (começando pelas que têm dados abertos: SP, MG, RS…)
- [ ] Discursos, comissões, frentes parlamentares, viagens oficiais
- [ ] Legislaturas anteriores

## Métricas (definições públicas no site)

- **Fidelidade partidária** — % de votações nominais em que o voto foi igual à
  orientação do partido (ou do bloco que contém o partido). Ignora "Liberado" e
  votações sem orientação. No Senado, onde não há orientação publicada de forma
  consistente, usa o voto da **maioria do partido**.
- **Alinhamento com o governo** — % de votos iguais à orientação da liderança do
  Governo. No Senado, usa o voto do líder do Governo como referência.
- **Participação** — % das votações nominais de plenário, durante o exercício do
  mandato, em que o parlamentar registrou voto (inclui abstenção e obstrução).
  Não é "presença" oficial: falta justificada também conta como ausência aqui.

## Estrutura do repositório

```
pipeline/           coleta e processamento (rodado no CI)
  sources/          um módulo por fonte (camara, senado, tse, transparencia, ibge)
  build.ts          orquestra tudo e grava data/ e public/data/
  fixtures.ts       gera dados de EXEMPLO (fictícios) para desenvolvimento offline
data/               JSON lido no build (gerado, não versionado)
public/data/        JSON servido ao navegador (gerado, não versionado)
src/app/            páginas (Next.js App Router)
src/components/     componentes de UI (hemiciclo, barras, mapa, cards)
src/lib/            tipos, leitura de dados, formatação, cores de partidos
.github/workflows/  build diário + deploy
```

## Riscos e pontos em aberto

- A API do Senado está em migração; alguns endpoints podem mudar e precisam ser
  validados na primeira execução real do pipeline.
- Arquivos do TSE são grandes (centenas de MB). O pipeline baixa por UF e só
  guarda o necessário; o cache do Actions evita baixar tudo todo dia.
- Orientação partidária na Câmara às vezes vem por **bloco**; o cruzamento
  partido → bloco usa a sigla contida no nome do bloco.
- Classificação Esquerda/Centro/Direita dos partidos é uma escolha editorial;
  usaremos uma tabela pública e explicada no site (ou deixamos só partidos, se
  preferir manter neutralidade total).
