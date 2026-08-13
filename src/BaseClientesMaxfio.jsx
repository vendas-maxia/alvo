import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import {
  Upload, Search, X, MapPin, Phone, Mail, Building2, Filter,
  ChevronLeft, ChevronRight, Users, RefreshCw, Trash2, Tag,
  MessageCircle, Calendar, ExternalLink, Info, ChevronDown
} from "lucide-react";

// Mesmo projeto Supabase usado pelo CRM Sicredi/MaxIA
const SUPABASE_URL = "https://qvxyhkvgpanscvemupsz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable__Q5oBtmwoUJPQsdpJPMnLg_gSg2y7PI";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const CLIENTES_TABLE = "ativamax_carteira_clientes";
const BATCH_SIZE = 500;

const PAGE_SIZE = 40;

const CARTEIRA_COLORS = {
  MAXFIO: { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" },
  IMP: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  VF: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
};

const CARTEIRA_LABELS = { MAXFIO: "Base1", IMP: "Base2", VF: "Base3" };

const PORTE_OPCOES = ["Não informado", "Pequena", "Média", "Grande"];

const RAMO_KEYWORDS = [
  ["ELETRIC", "Materiais elétricos"], ["ELETRO", "Materiais elétricos"],
  ["CONSTRU", "Construção civil"], ["ENGENHARIA", "Engenharia"],
  ["INCORPORA", "Incorporação imobiliária"], ["IMOBILI", "Imobiliário"],
  ["EMPREEND", "Empreendimentos"], ["HIDRAULIC", "Hidráulica"],
  ["FERRAGEM", "Ferragens"], ["FERRAMENTA", "Ferramentas"],
  ["MOVEIS", "Móveis"], ["ALIMENT", "Alimentos"],
  ["SUPERMERCADO", "Varejo alimentar"], ["MERCADO", "Varejo alimentar"],
  ["TRANSPORT", "Transporte e logística"], ["INDUSTRIA", "Indústria"],
  ["METALURG", "Metalurgia"], ["AUTOMA", "Automação industrial"],
  ["CONFEC", "Confecção/têxtil"], ["AGRO", "Agronegócio"],
  ["ESCOLA", "Educação"], ["ENSINO", "Educação"], ["SAUDE", "Saúde"],
  ["HOSPITAL", "Saúde"], ["CLINICA", "Saúde"], ["ENERGIA", "Energia"],
  ["SOLAR", "Energia solar"], ["MANUTEN", "Manutenção industrial"],
  ["INSTAL", "Instalações técnicas"], ["SERVICOS", "Serviços"],
  ["DISTRIBUI", "Distribuição/atacado"], ["COMERCIO", "Comércio"],
];

function inferRamo(nome) {
  const n = (nome || "").toUpperCase();
  for (const [kw, ramo] of RAMO_KEYWORDS) {
    if (n.includes(kw)) return ramo;
  }
  return "Não identificado";
}

function extractUF(endereco) {
  if (!endereco) return "";
  const m = endereco.match(/CEP\s*[\d-]{8,9}\s*·\s*([A-Z]{2})\b/);
  return m ? m[1] : "";
}

function safeParseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function normalizeRow(row) {
  const carteiras = safeParseList(row.carteiras).length
    ? safeParseList(row.carteiras)
    : row.origem
    ? [row.origem]
    : [];
  return {
    id: row.id || Math.random().toString(36).slice(2),
    codigo: (row.codigo || "").trim(),
    nome: (row.nome || "").trim(),
    cnpj: (row.cnpj || "").trim(),
    cidade: (row.cidade || "").trim(),
    uf: extractUF(row.endereco),
    telefone: (row.telefone || "").trim(),
    whatsapp: (row.whatsapp || "").trim(),
    email: (row.email || "").trim(),
    contato: (row.contato || "").trim(),
    endereco: (row.endereco || "").trim(),
    representante: (row.representante || "").trim(),
    ultimaCompra: (row.ultima_compra || "").trim(),
    carteiras,
    canaisOk: safeParseList(row.canais_ok),
    ramo: inferRamo(row.nome),
    porte: "Não informado",
    nota: "",
  };
}

// Converte o objeto do cliente (camelCase) para o formato de linha do Supabase (snake_case)
function toDb(c) {
  return {
    id: c.id,
    codigo: c.codigo || "",
    nome: c.nome || "",
    cnpj: c.cnpj || "",
    cidade: c.cidade || "",
    uf: c.uf || "",
    telefone: c.telefone || "",
    whatsapp: c.whatsapp || "",
    email: c.email || "",
    contato: c.contato || "",
    endereco: c.endereco || "",
    representante: c.representante || "",
    ultima_compra: c.ultimaCompra || null,
    carteiras: c.carteiras || [],
    canais_ok: c.canaisOk || [],
    ramo: c.ramo || "Não identificado",
    porte: c.porte || "Não informado",
    nota: c.nota || "",
  };
}

// Converte uma linha do Supabase (snake_case) de volta para o objeto do cliente (camelCase)
function fromDb(r) {
  return {
    id: r.id,
    codigo: r.codigo || "",
    nome: r.nome || "",
    cnpj: r.cnpj || "",
    cidade: r.cidade || "",
    uf: r.uf || "",
    telefone: r.telefone || "",
    whatsapp: r.whatsapp || "",
    email: r.email || "",
    contato: r.contato || "",
    endereco: r.endereco || "",
    representante: r.representante || "",
    ultimaCompra: r.ultima_compra || "",
    carteiras: r.carteiras || [],
    canaisOk: r.canais_ok || [],
    ramo: r.ramo || "Não identificado",
    porte: r.porte || "Não informado",
    nota: r.nota || "",
  };
}

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString("pt-BR");
}

export default function BaseClientesMaxfio() {
  const [clients, setClients] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filtroCarteira, setFiltroCarteira] = useState("Todas");
  const [filtroRamo, setFiltroRamo] = useState("Todos");
  const [filtroUF, setFiltroUF] = useState("Todas");
  const [filtroCidade, setFiltroCidade] = useState("Todas");
  const [filtroPorte, setFiltroPorte] = useState("Todos");
  const [filtroHistorico, setFiltroHistorico] = useState("Todos");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from(CLIENTES_TABLE).select("*").order("nome", { ascending: true });
        if (error) throw error;
        setClients((data || []).map(fromDb));
      } catch (e) {
        console.error("Falha ao carregar base do Supabase", e);
        setClients(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setImporting(true);
    setImportMsg("Lendo arquivo...");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map(normalizeRow).filter((r) => r.nome);
        const merged = clients ? mergeClients(clients, rows) : rows;
        setClients(merged);
        try {
          const toSend = rows.map(toDb);
          const totalBatches = Math.ceil(toSend.length / BATCH_SIZE);
          for (let i = 0; i < totalBatches; i++) {
            const batch = toSend.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
            setImportMsg(`Enviando para o Supabase... lote ${i + 1} de ${totalBatches} (${batch.length} registros)`);
            const { error } = await supabase.from(CLIENTES_TABLE).upsert(batch, { onConflict: "id" });
            if (error) throw error;
          }
          setImportMsg(`Importado! ${rows.length} registros enviados ao Supabase. Base total: ${merged.length} clientes.`);
        } catch (e) {
          console.error("Falha ao importar para o Supabase", e);
          setImportMsg("Erro ao enviar para o Supabase — veja o console para detalhes.");
        }
        setImporting(false);
        setTimeout(() => setImportMsg(""), 6000);
      },
      error: () => {
        setImportMsg("Erro ao ler o arquivo. Verifique se é um CSV válido.");
        setImporting(false);
      },
    });
  }, [clients]);

  function mergeClients(existing, incoming) {
    const map = new Map(existing.map((c) => [c.id, c]));
    for (const r of incoming) {
      if (map.has(r.id)) {
        const prev = map.get(r.id);
        map.set(r.id, {
          ...prev,
          ...r,
          ramo: prev.ramo !== "Não identificado" ? prev.ramo : r.ramo,
          porte: prev.porte,
          nota: prev.nota,
          carteiras: Array.from(new Set([...(prev.carteiras || []), ...(r.carteiras || [])])),
        });
      } else {
        map.set(r.id, r);
      }
    }
    return Array.from(map.values());
  }

  const saveField = useCallback(async (id, patch) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      const current = clients.find((c) => c.id === id);
      const { error } = await supabase.from(CLIENTES_TABLE).upsert([toDb({ ...current, ...patch })], { onConflict: "id" });
      if (error) throw error;
    } catch (e) {
      console.error("Falha ao salvar no Supabase", e);
    }
  }, [clients]);

  const enriched = useMemo(() => clients || [], [clients]);

  const facets = useMemo(() => {
    const ramos = new Set(), ufs = new Set(), cidades = new Set();
    for (const c of enriched) {
      ramos.add(c.ramo || "Não identificado");
      if (c.uf) ufs.add(c.uf);
      if (c.cidade) cidades.add(c.cidade);
    }
    return {
      ramos: Array.from(ramos).sort(),
      ufs: Array.from(ufs).sort(),
      cidades: Array.from(cidades).sort(),
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((c) => {
      if (filtroCarteira !== "Todas" && !(c.carteiras || []).includes(filtroCarteira)) return false;
      if (filtroRamo !== "Todos" && c.ramo !== filtroRamo) return false;
      if (filtroUF !== "Todas" && c.uf !== filtroUF) return false;
      if (filtroCidade !== "Todas" && c.cidade !== filtroCidade) return false;
      if (filtroPorte !== "Todos" && (c.porte || "Não informado") !== filtroPorte) return false;
      if (filtroHistorico === "Com compra" && !c.ultimaCompra) return false;
      if (filtroHistorico === "Sem compra" && c.ultimaCompra) return false;
      if (filtroHistorico === "Sem contato registrado" && (c.canaisOk || []).length > 0) return false;
      if (q) {
        const hay = `${c.nome} ${c.cnpj} ${c.cidade} ${c.representante}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, search, filtroCarteira, filtroRamo, filtroUF, filtroCidade, filtroPorte, filtroHistorico]);

  useEffect(() => setPage(1), [search, filtroCarteira, filtroRamo, filtroUF, filtroCidade, filtroPorte, filtroHistorico]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    if (!clients) return null;
    const byCarteira = {};
    for (const c of enriched) for (const w of c.carteiras || []) byCarteira[w] = (byCarteira[w] || 0) + 1;
    const semContato = enriched.filter((c) => (c.canaisOk || []).length === 0).length;
    return { total: enriched.length, byCarteira, semContato };
  }, [clients, enriched]);

  async function clearBase() {
    if (!window.confirm("Isso vai apagar TODA a base no Supabase (não só localmente). Essa ação não pode ser desfeita. Confirmar?")) return;
    setClients([]);
    try {
      const { error } = await supabase.from(CLIENTES_TABLE).delete().not("id", "is", null);
      if (error) throw error;
    } catch (e) {
      console.error("Falha ao limpar base no Supabase", e);
    }
  }

  if (loading) {
    return <div style={{ minHeight: 400 }} className="flex items-center justify-center text-stone-400 text-sm">Carregando base...</div>;
  }

  const hasData = clients && clients.length > 0;

  return (
    <div style={{ minHeight: 700, fontFamily: "Inter, ui-sans-serif, system-ui", position: "relative" }} className="w-full bg-stone-100 text-stone-900 flex flex-col">
      {/* Top bar */}
      <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-700 flex items-center justify-center font-bold text-sm">MX</div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Base de clientes — Maxfio / AtivaMax</h1>
            <p className="text-xs text-stone-400">Carteira comercial (Base1, Base2, Base3)</p>
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center"><div className="text-lg font-bold">{stats.total}</div><div className="text-stone-400">clientes</div></div>
            {Object.entries(stats.byCarteira).map(([k, v]) => (
              <div className="text-center" key={k}><div className="text-lg font-bold" style={{ color: CARTEIRA_COLORS[k]?.border || "#fff" }}>{v}</div><div className="text-stone-400">{CARTEIRA_LABELS[k] || k}</div></div>
            ))}
            <div className="text-center"><div className="text-lg font-bold text-amber-400">{stats.semContato}</div><div className="text-stone-400">sem contato</div></div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 px-3 py-2 rounded-md font-medium">
            <Upload size={14} /> Importar CSV
          </button>
          {hasData && (
            <button onClick={clearBase} className="flex items-center gap-1.5 text-xs bg-stone-800 hover:bg-stone-700 px-3 py-2 rounded-md">
              <Trash2 size={14} /> Limpar base
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      </div>

      {importMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-5 py-2 border-b border-emerald-200 flex items-center gap-2">
          <RefreshCw size={12} className={importing ? "animate-spin" : ""} /> {importMsg}
        </div>
      )}

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-stone-500 p-10">
          <Building2 size={40} className="text-stone-300" />
          <p className="text-sm text-center max-w-md">
            Nenhuma base carregada ainda. Importe o CSV exportado do Supabase (ex: ativamax_carteira_rows.csv)
            para começar a filtrar por região, ramo, carteira e histórico.
          </p>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium px-4 py-2 rounded-md">
            <Upload size={15} /> Selecionar arquivo CSV
          </button>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* Filters sidebar */}
          <div style={{ width: 260 }} className="flex-shrink-0 border-r border-stone-200 bg-white p-4 space-y-4 overflow-y-auto">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-2.5 text-stone-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, CNPJ, cidade..." className="w-full pl-8 pr-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <FilterGroup label="Carteira">
              <select value={filtroCarteira} onChange={(e) => setFiltroCarteira(e.target.value)} className="w-full text-xs border border-stone-300 rounded-md px-2 py-1.5">
                <option>Todas</option>
                {Object.keys(CARTEIRA_COLORS).map((c) => <option key={c} value={c}>{CARTEIRA_LABELS[c] || c}</option>)}
              </select>
            </FilterGroup>

            <FilterGroup label="Ramo (inferido pelo nome)">
              <select value={filtroRamo} onChange={(e) => setFiltroRamo(e.target.value)} className="w-full text-xs border border-stone-300 rounded-md px-2 py-1.5">
                <option>Todos</option>
                {facets.ramos.map((r) => <option key={r}>{r}</option>)}
              </select>
            </FilterGroup>

            <FilterGroup label="UF">
              <select value={filtroUF} onChange={(e) => setFiltroUF(e.target.value)} className="w-full text-xs border border-stone-300 rounded-md px-2 py-1.5">
                <option>Todas</option>
                {facets.ufs.map((u) => <option key={u}>{u}</option>)}
              </select>
            </FilterGroup>

            <FilterGroup label="Cidade">
              <select value={filtroCidade} onChange={(e) => setFiltroCidade(e.target.value)} className="w-full text-xs border border-stone-300 rounded-md px-2 py-1.5">
                <option>Todas</option>
                {facets.cidades.slice(0, 300).map((c) => <option key={c}>{c}</option>)}
              </select>
            </FilterGroup>

            <FilterGroup label="Porte da empresa (manual)">
              <select value={filtroPorte} onChange={(e) => setFiltroPorte(e.target.value)} className="w-full text-xs border border-stone-300 rounded-md px-2 py-1.5">
                <option>Todos</option>
                {PORTE_OPCOES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </FilterGroup>

            <FilterGroup label="Histórico">
              <select value={filtroHistorico} onChange={(e) => setFiltroHistorico(e.target.value)} className="w-full text-xs border border-stone-300 rounded-md px-2 py-1.5">
                <option>Todos</option>
                <option>Com compra</option>
                <option>Sem compra</option>
                <option>Sem contato registrado</option>
              </select>
            </FilterGroup>

            <div className="pt-2 border-t border-stone-100 text-xs text-stone-400 flex items-start gap-1.5">
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              Ramo é inferido pelo nome da empresa e porte é manual — corrija clicando em um cliente.
            </div>

            <div className="text-xs text-stone-500">{filtered.length} de {enriched.length} clientes</div>
          </div>

          {/* Table */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "26%" }} /><col style={{ width: "13%" }} /><col style={{ width: "12%" }} />
                  <col style={{ width: "14%" }} /><col style={{ width: "12%" }} /><col style={{ width: "11%" }} /><col style={{ width: "12%" }} />
                </colgroup>
                <thead className="bg-stone-50 sticky top-0 border-b border-stone-200">
                  <tr className="text-left text-stone-500">
                    <th className="px-3 py-2 font-medium">Empresa</th>
                    <th className="px-3 py-2 font-medium">CNPJ</th>
                    <th className="px-3 py-2 font-medium">Cidade/UF</th>
                    <th className="px-3 py-2 font-medium">Ramo</th>
                    <th className="px-3 py-2 font-medium">Carteira</th>
                    <th className="px-3 py-2 font-medium">Última compra</th>
                    <th className="px-3 py-2 font-medium">Representante</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((c) => (
                    <tr key={c.id} onClick={() => setSelected(c)} className="border-b border-stone-100 hover:bg-emerald-50 cursor-pointer">
                      <td className="px-3 py-2 truncate font-medium text-stone-800">{c.nome}</td>
                      <td className="px-3 py-2 truncate text-stone-500">{c.cnpj || "—"}</td>
                      <td className="px-3 py-2 truncate text-stone-500">{[c.cidade, c.uf].filter(Boolean).join(" / ") || "—"}</td>
                      <td className="px-3 py-2 truncate text-stone-500">{c.ramo}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          {(c.carteiras || []).map((w) => (
                            <span key={w} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: CARTEIRA_COLORS[w]?.bg, color: CARTEIRA_COLORS[w]?.text }}>{CARTEIRA_LABELS[w] || w}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-stone-500">{fmtDate(c.ultimaCompra)}</td>
                      <td className="px-3 py-2 truncate text-stone-500">{c.representante || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pageItems.length === 0 && <div className="p-8 text-center text-sm text-stone-400">Nenhum cliente corresponde aos filtros.</div>}
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-t border-stone-200 bg-white text-xs">
              <span className="text-stone-500">Página {page} de {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-stone-300 rounded disabled:opacity-30"><ChevronLeft size={14} /></button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-stone-300 rounded disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} className="flex justify-end z-10" onClick={() => setSelected(null)}>
          <div style={{ width: 380 }} className="bg-white h-full overflow-y-auto p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold text-stone-800 pr-4">{selected.nome}</h2>
              <button onClick={() => setSelected(null)} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(selected.carteiras || []).map((w) => (
                <span key={w} className="px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: CARTEIRA_COLORS[w]?.bg, color: CARTEIRA_COLORS[w]?.text }}>{CARTEIRA_LABELS[w] || w}</span>
              ))}
            </div>

            <DetailRow icon={Building2} label="CNPJ" value={selected.cnpj} />
            <DetailRow icon={MapPin} label="Endereço" value={selected.endereco || [selected.cidade, selected.uf].filter(Boolean).join(" / ")} />
            <DetailRow icon={Phone} label="Telefone" value={selected.telefone} />
            <DetailRow icon={MessageCircle} label="WhatsApp" value={selected.whatsapp} />
            <DetailRow icon={Mail} label="E-mail" value={selected.email} />
            <DetailRow icon={Users} label="Contato" value={selected.contato} />
            <DetailRow icon={Users} label="Representante" value={selected.representante} />
            <DetailRow icon={Calendar} label="Última compra" value={fmtDate(selected.ultimaCompra)} />

            <div>
              <span className="block text-xs font-medium text-stone-500 mb-1">Ramo (inferido — pode corrigir)</span>
              <input
                defaultValue={selected.ramo}
                onBlur={(e) => saveField(selected.id, { ramo: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-stone-500 mb-1">Porte da empresa</span>
              <select
                defaultValue={selected.porte || "Não informado"}
                onChange={(e) => saveField(selected.id, { porte: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PORTE_OPCOES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <span className="block text-xs font-medium text-stone-500 mb-1">Anotação</span>
              <textarea
                defaultValue={selected.nota || ""}
                onBlur={(e) => saveField(selected.id, { nota: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {selected.canaisOk?.length > 0 && (
              <div>
                <span className="block text-xs font-medium text-stone-500 mb-1">Canais já trabalhados</span>
                <div className="flex gap-1 flex-wrap">
                  {selected.canaisOk.map((c) => <span key={c} className="px-2 py-0.5 bg-stone-100 rounded text-[11px] text-stone-600">{c}</span>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div>
      <span className="block text-[11px] font-medium text-stone-500 mb-1">{label}</span>
      {children}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon size={14} className="text-stone-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] text-stone-400">{label}</div>
        <div className="text-stone-700 break-words">{value || "—"}</div>
      </div>
    </div>
  );
}
