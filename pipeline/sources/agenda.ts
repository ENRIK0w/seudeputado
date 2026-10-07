// Agenda das próximas sessões deliberativas (as que votam) da Câmara, do Senado e
// do Congresso. Ficam de fora sessões solenes, audiências, visitas e afins.
import type { EventoAgenda, ItemPauta } from "../../src/lib/types";
import { emParalelo, getJson } from "../lib/http";
import { campo } from "../lib/util";

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";
const PLENARIO_CAMARA = 180;
const DIAS = 14;
const MAX_ITENS = 25;

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Hoje no horário de Brasília (UTC−3, sem horário de verão). */
const hojeBrasilia = () => new Date(Date.now() - 3 * 3600e3);

const amostra = (nome: string, x: unknown) => console.log(`  · ${nome}: ${JSON.stringify(x)?.slice(0, 600)}`);

interface EventoCamara {
  id: number;
  dataHoraInicio: string;
  situacao: string;
  descricaoTipo: string;
  descricao: string;
  orgaos: { sigla: string }[];
}
interface ItemPautaCamara {
  titulo?: string;
  regime?: string;
  proposicao_?: { id: number; siglaTipo: string; numero: number; ano: number; ementa: string } | null;
  proposicaoRelacionada_?: { id: number; siglaTipo: string; numero: number; ano: number; ementa: string } | null;
}

// Projetos que vão a voto (requerimentos e afins entram pelo projeto a que se referem)
const TIPOS = new Set(["PL", "PLP", "PEC", "PDL", "MPV", "PLV", "PRC", "PLN", "PRS", "VET", "PDS"]);

async function agendaCamara(inicio: string, fim: string): Promise<EventoAgenda[]> {
  const r = await getJson<{ dados: EventoCamara[] }>(
    `${CAMARA}/eventos?idOrgao=${PLENARIO_CAMARA}&dataInicio=${inicio}&dataFim=${fim}&itens=100&ordem=ASC&ordenarPor=dataHoraInicio`,
    { maxIdadeHoras: 3 },
  );
  const tipos = new Map<string, number>();
  for (const e of r.dados) tipos.set(e.descricaoTipo, (tipos.get(e.descricaoTipo) ?? 0) + 1);
  console.log(`  · Câmara: ${r.dados.length} eventos do plenário — ${[...tipos].map(([t, n]) => `${t} (${n})`).join(", ")}`);
  if (r.dados[0]) amostra("exemplo de evento", r.dados[0]);

  const deliberativas = r.dados.filter((e) => /deliberativa/i.test(e.descricaoTipo) && !/n[ãa]o deliberativa/i.test(e.descricaoTipo) && !/cancelad/i.test(e.situacao));
  const eventos: EventoAgenda[] = [];
  await emParalelo(deliberativas, 4, async (e) => {
    let pauta: ItemPautaCamara[] = [];
    try {
      pauta = (await getJson<{ dados: ItemPautaCamara[] }>(`${CAMARA}/eventos/${e.id}/pauta`, { maxIdadeHoras: 3 })).dados;
      if (pauta[0] && eventos.length === 0) amostra("exemplo de item da pauta", pauta[0]);
    } catch {
      /* pauta ainda não publicada */
    }
    const itens = new Map<string, ItemPauta>();
    for (const it of pauta) {
      const p = it.proposicao_ && TIPOS.has(it.proposicao_.siglaTipo) ? it.proposicao_ : it.proposicaoRelacionada_;
      if (!p || !TIPOS.has(p.siglaTipo)) continue;
      const sigla = `${p.siglaTipo} ${p.numero}/${p.ano}`;
      if (!itens.has(sigla))
        itens.set(sigla, { sigla, ementa: p.ementa ?? "", projeto: `camara-${p.id}`, url: `https://www.camara.leg.br/propostas-legislativas/${p.id}` });
    }
    const [data, hora] = e.dataHoraInicio.split("T");
    eventos.push({
      id: `camara-${e.id}`,
      casa: "camara",
      data,
      hora: hora?.slice(0, 5) ?? null,
      tipo: e.descricaoTipo,
      situacao: e.situacao ?? null,
      url: `https://www.camara.leg.br/evento-legislativo/${e.id}`,
      itens: [...itens.values()].slice(0, MAX_ITENS),
    });
  });
  return eventos;
}

/** Procura, em qualquer profundidade, os objetos que têm uma das chaves. */
function encontrar(x: unknown, chaves: string[], achados: Record<string, unknown>[] = []) {
  if (Array.isArray(x)) for (const i of x) encontrar(i, chaves, achados);
  else if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (chaves.some((k) => k in o)) achados.push(o);
    else for (const v of Object.values(o)) encontrar(v, chaves, achados);
  }
  return achados;
}

const dataSenado = (s: unknown) => {
  const t = String(s ?? "");
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : t.slice(0, 10);
};

async function agendaSenado(inicio: string, fim: string): Promise<EventoAgenda[]> {
  // A agenda do plenário vem por mês; pega o mês de hoje e o do fim da janela.
  const meses = [...new Set([inicio, fim].map((d) => `${d.slice(0, 4)}${d.slice(5, 7)}01`))];
  const eventos: EventoAgenda[] = [];
  for (const mes of meses) {
    const bruto = await getJson<unknown>(`${SENADO}/plenario/agenda/mes/${mes}`, { maxIdadeHoras: 3 });
    const sessoes = encontrar(bruto, ["CodigoSessao", "codigoSessao"]);
    console.log(`  · Senado ${mes.slice(0, 6)}: ${sessoes.length} sessões`);
    if (sessoes[0]) amostra("exemplo de sessão", sessoes[0]);
    for (const s of sessoes) {
      const data = dataSenado(campo(s, "DataSessao", "Data"));
      if (data < inicio || data > fim) continue;
      const tipo = String(campo(s, "DescricaoTipoSessao", "TipoSessao", "NomeTipoSessao") ?? "Sessão");
      const situacao = (campo<string>(s, "SituacaoSessao", "DescricaoSituacaoSessao") as string) ?? null;
      const casa = /^CN$/i.test(String(campo(s, "SiglaCasa", "Casa") ?? "")) || /congresso/i.test(tipo) ? "congresso" : "senado";
      // Só sessões que votam: as não deliberativas e solenes ficam de fora
      if (/n[ãa]o deliberativa|solene|especial|debates/i.test(tipo) || /cancelad|n[ãa]o realizada/i.test(situacao ?? "")) continue;
      const itens = new Map<string, ItemPauta>();
      for (const m of encontrar(s, ["CodigoMateria", "codigoMateria"])) {
        const sigla = String(campo(m, "SiglaMateria", "Sigla", "SiglaSubtipoMateria") ?? "");
        const numero = Number(campo(m, "NumeroMateria", "Numero"));
        const ano = campo(m, "AnoMateria", "Ano");
        if (!TIPOS.has(sigla) || !numero) continue;
        const cod = campo(m, "CodigoMateria");
        const chave = `${sigla} ${numero}/${ano}`;
        if (!itens.has(chave))
          itens.set(chave, {
            sigla: chave,
            ementa: String(campo(m, "EmentaMateria", "Ementa") ?? ""),
            projeto: `senado-${cod}`,
            url: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${cod}`,
          });
      }
      const hora = String(campo(s, "HoraInicioSessao", "Hora", "HoraInicio") ?? "").match(/\d{2}:\d{2}/)?.[0] ?? null;
      eventos.push({
        id: `${casa}-${campo(s, "CodigoSessao")}`,
        casa,
        data,
        hora,
        tipo,
        situacao,
        url: "https://www25.senado.leg.br/web/atividade/plenario",
        itens: [...itens.values()].slice(0, MAX_ITENS),
      });
    }
  }
  return eventos;
}

export async function coletarAgenda(): Promise<EventoAgenda[]> {
  console.log("Agenda: próximas sessões deliberativas");
  const hoje = hojeBrasilia();
  const inicio = iso(hoje);
  const fim = iso(new Date(hoje.getTime() + DIAS * 86400e3));
  const partes = await Promise.allSettled([agendaCamara(inicio, fim), agendaSenado(inicio, fim)]);
  const eventos: EventoAgenda[] = [];
  for (const [i, p] of partes.entries()) {
    if (p.status === "fulfilled") eventos.push(...p.value);
    else console.warn(`  ! agenda ${i === 0 ? "Câmara" : "Senado"} falhou: ${(p.reason as Error)?.message}`);
  }
  // Mesma sessão do Congresso pode vir duas vezes; fica a primeira
  const unicos = [...new Map(eventos.map((e) => [e.id, e])).values()];
  unicos.sort((a, b) => `${a.data}${a.hora ?? ""}`.localeCompare(`${b.data}${b.hora ?? ""}`));
  console.log(`  · agenda: ${unicos.length} sessões deliberativas em ${DIAS} dias (${unicos.reduce((s, e) => s + e.itens.length, 0)} itens de pauta)`);
  return unicos;
}

