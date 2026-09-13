import React, { useState } from 'react';
import { Filter, Trash2, Radio, Terminal as TermIcon, ArrowDownCircle } from 'lucide-react';

export function LiveFeedTerminal({ logs, instancias, onLimpar, instanciaFiltro, setInstanciaFiltro }) {
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const logsFiltrados = logs.filter(log => {
    // 1. Filtro por Instância
    if (instanciaFiltro !== 'TODAS' && log.instanciaId !== instanciaFiltro) {
      return false;
    }
    // 2. Filtro por Tipo de Evento
    if (tipoFiltro !== 'TODOS') {
      if (log.nivel !== 'evento' || log.evento?.tipo !== tipoFiltro) return false;
    }
    // 3. Filtro por Texto / Usuário
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      const user = log.evento?.usuario?.apelido?.toLowerCase() || '';
      const texto = log.texto?.toLowerCase() || '';
      const acao = log.evento?.acao?.toLowerCase() || '';
      if (!user.includes(termo) && !texto.includes(termo) && !acao.includes(termo)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="bg-dark-850 border border-dark-700/80 rounded-2xl flex flex-col h-[520px] shadow-2xl overflow-hidden">
      {/* Barra Superior com Controles */}
      <div className="bg-dark-800/80 px-4 py-3 border-b border-dark-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="text-xs font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5 font-mono">
            <TermIcon size={14} className="text-brand-500" /> Terminal de Eventos
          </span>
          <span className="text-[11px] bg-dark-700 text-zinc-400 px-2 py-0.5 rounded-full">
            {logsFiltrados.length} eventos
          </span>
        </div>

        {/* Filtros em Linha */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Instância / Live */}
          <select
            value={instanciaFiltro}
            onChange={(e) => setInstanciaFiltro(e.target.value)}
            className="bg-dark-900 border border-dark-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="TODAS">🌐 Todas as Lives</option>
            {instancias.map((inst) => (
              <option key={inst.id} value={inst.id}>
                📺 {inst.nome} (@{inst.tiktokUsername})
              </option>
            ))}
          </select>

          {/* Tipo de Evento */}
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="bg-dark-900 border border-dark-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="PRESENTE">🎁 Presentes</option>
            <option value="COMENTARIO">💬 Comentários</option>
            <option value="LIKE">❤️ Curtidas</option>
            <option value="SEGUIDOR">👤 Seguidor</option>
          </select>

          {/* Campo de Busca */}
          <input
            type="text"
            placeholder="Buscar usuário/ação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-dark-900 border border-dark-700 text-zinc-200 text-xs rounded-lg px-2.5 py-1.5 w-36 focus:outline-none focus:border-brand-500"
          />

          <button
            onClick={onLimpar}
            title="Limpar Terminal"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-dark-700 rounded-lg transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Janela de Logs com Scroll */}
      <div className="flex-1 p-4 font-mono text-[12px] space-y-2 overflow-y-auto bg-dark-900/60 select-text">
        {logsFiltrados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
            <Radio size={24} className="animate-pulse" />
            <p>Nenhum evento registrado com os filtros selecionados.</p>
          </div>
        ) : (
          logsFiltrados.map((log, index) => {
            const instNome = instancias.find(i => i.id === log.instanciaId)?.nome || log.instanciaNome || "Live";

            if (log.nivel === 'evento') {
              const ev = log.evento;
              return (
                <div key={index} className="flex items-start gap-2 hover:bg-dark-800/40 p-1 rounded transition">
                  <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                  
                  {/* Badge da Instância que originou o evento */}
                  <span className="bg-dark-700 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0">
                    {instNome}
                  </span>

                  {/* Badge do Tipo */}
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                    ev.tipo === 'PRESENTE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    ev.tipo === 'COMENTARIO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    ev.tipo === 'LIKE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {ev.tipo}
                  </span>

                  {/* Detalhes do Usuário e Ação */}
                  <span className="text-zinc-200 font-semibold">{ev.usuario.apelido}</span>
                  <span className="text-zinc-500">→</span>
                  <span className="text-amber-300 font-medium">+{ev.pontos} pts</span>
                  <span className="text-zinc-400 font-mono text-[11px] bg-dark-850 px-1.5 rounded border border-dark-700">
                    {ev.acao}
                  </span>

                  {ev.detalhes?.mensagem && (
                    <span className="text-zinc-400 italic truncate max-w-xs">"{ev.detalhes.mensagem}"</span>
                  )}
                  {ev.detalhes?.giftName && (
                    <span className="text-pink-400 font-medium">({ev.detalhes.giftName} x{ev.detalhes.quantidade})</span>
                  )}
                </div>
              );
            }

            return (
              <div key={index} className="flex items-center gap-2 p-1 text-zinc-400">
                <span className="text-zinc-600">[{log.timestamp}]</span>
                <span className="bg-dark-700 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded">{instNome}</span>
                <span className={log.nivel === 'erro' ? 'text-rose-400' : 'text-zinc-400'}>
                  {log.texto}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}