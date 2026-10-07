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

- **Sem banco de dados (por enquanto).** O `pipeline/` baixa as fontes oficiais, cruza,
  calcula as métricas e grava JSON em `data/` (lido pelo servidor) e `public/data/`
  (baixado pelo navegador).
- **Páginas sob demanda (ISR).** Início e listas são geradas no build; cada perfil e
  cada votação é gerado na primeira visita e fica em cache por 1 dia. Isso evita
  gerar milhares de páginas no build e respeita o limite de rotas da Vercel.

| Pasta | O que é |
|---|---|
| `pipeline/sources/` | um coletor por fonte: Câmara, Senado, TSE, Transparência, IBGE |
| `pipeline/build.ts` | orquestra a coleta e grava `data/` e `public/data/` |
| `pipeline/fixtures.ts` | gera dados de exemplo fictícios |
| `src/app/` | páginas: início, perfil (`/p/[slug]`), votações, cidade, metodologia |
| `src/components/` | hemiciclo, mapa eleitoral, mapa de votos, gráficos |

## Publicação com dados reais (Vercel)

A coleta roda no GitHub Actions e publica na Vercel já construído — a Vercel não
faz build sozinha a cada push (`vercel.json` desliga o deploy por git).

| Workflow | Quando | O que faz |
|---|---|---|
| **Atualizar dados e publicar** | todo dia 03:17 + manual | coleta Câmara, Senado e emendas, confere (erro = não publica) e publica |
| **Atualizar dados do TSE** | manual, após eleições | baixa o TSE e grava `dados-base/tse/` com um commit |
| **Testar coleta real** | manual | roda a coleta e guarda dados e relatório, sem publicar |

Configuração (uma vez):

1. Na Vercel, crie um token em **Account Settings → Tokens**.
2. No projeto da Vercel, em **Settings → General**, copie o **Project ID**; em
   **Team/Account Settings → General**, copie o **Team ID** (ou User ID).
3. No GitHub, em **Settings → Secrets and variables → Actions**, crie os segredos
   `VERCEL_TOKEN`, `VERCEL_ORG_ID` (Team ID) e `VERCEL_PROJECT_ID`.
4. Rode **Atualizar dados do TSE** uma vez e depois **Atualizar dados e publicar**.

Mudanças de código também só entram no ar pelo workflow de publicação (rode-o
manualmente depois de um merge).
