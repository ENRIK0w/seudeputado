# Seu Deputado

Dossiê aberto de cada deputado federal e senador: como votou, o que propôs, quanto
gastou da cota, para onde mandou emendas, por quais partidos passou e onde foi votado.

Plano completo, decisões e roadmap: [PLANO.md](PLANO.md).

## Rodando localmente

```bash
npm install
npm run dados:exemplo   # gera dados FICTÍCIOS em data/ e public/data/ (offline, 3 s)
npm run dev             # http://localhost:3000
```

Para usar os dados oficiais (precisa de internet; a primeira execução baixa alguns GB do TSE):

```bash
npm run dados                      # tudo
npm run dados -- --sem-tse         # pula mapa eleitoral/patrimônio (bem mais rápido)
npm run dados -- --sem-emendas
```

Os downloads ficam em `.cache/` e são reaproveitados por ~20 h.

## Como funciona

- **Sem banco de dados.** O `pipeline/` baixa as fontes oficiais, cruza e calcula as
  métricas, e grava JSON. O Next.js gera um HTML estático por parlamentar e votação.
- **Atualização diária** pelo GitHub Actions (`.github/workflows/publicar.yml`), com
  deploy no GitHub Pages. Custo: zero.

| Pasta | O que é |
|---|---|
| `pipeline/sources/` | um coletor por fonte: Câmara, Senado, TSE, Transparência, IBGE |
| `pipeline/build.ts` | orquestra a coleta e grava `data/` e `public/data/` |
| `pipeline/fixtures.ts` | gera dados de exemplo fictícios |
| `src/app/` | páginas: início, perfil (`/p/[slug]`), votações, cidade, metodologia |
| `src/components/` | hemiciclo, mapa eleitoral, mapa de votos, gráficos |

## Publicação

1. Em *Settings → Pages*, escolha **GitHub Actions** como fonte.
2. Rode o workflow **Atualizar dados e publicar** (ou faça push na `main`).
3. Com domínio próprio, crie a variável de repositório `BASE_PATH` com o valor `/`.
