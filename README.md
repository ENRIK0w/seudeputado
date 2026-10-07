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

## Ver o site na Vercel (dados de exemplo)

1. Em vercel.com → **Add New… → Project**, importe `ENRIK0w/seudeputado`.
2. Não mude nada e clique em **Deploy**. O `vercel.json` já gera os dados de exemplo
   antes do build.

A publicação com dados reais (coleta diária no GitHub Actions) ainda depende da
decisão sobre hospedagem e banco — veja PLANO.md.
