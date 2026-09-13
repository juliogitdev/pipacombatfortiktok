import React, { useState } from 'react';
import { Play, Sparkles, MessageSquare, Heart, Gift } from 'lucide-react';
import { api } from '../services/api';

export function ActionSimulator({ instanciaAtiva }) {
  const [usuario, setUsuario] = useState('pro_player');
  const [comentario, setComentario] = useState('nick_roblox_123');
  const [giftSelecionado, setGiftSelecionado] = useState('Rosa');
  const [qtdLikes, setQtdLikes] = useState(1);

  if (!instanciaAtiva) {
    return (
      <div className="bg-dark-850 border border-dark-700 rounded-2xl p-6 text-center text-xs text-zinc-500">
        Selecione uma instância para habilitar o simulador de eventos.
      </div>
    );
  }

  const disparar = async (tipo) => {
    try {
      await api.simularEvento(instanciaAtiva.id, {
        tipo,
        usuario,
        comentario: tipo === 'COMENTARIO' ? comentario : undefined,
        giftName: tipo === 'PRESENTE' ? giftSelecionado : undefined,
        diamantes: giftSelecionado === 'Donut' ? 30 : 1,
        quantidade: tipo === 'LIKE' ? Number(qtdLikes) : 1
      });
    } catch (err) {
      alert(`Falha na simulação: ${err.message}`);
    }
  };

  return (
    <div className="bg-dark-850 border border-dark-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-dark-700 pb-3">
        <h3 className="text-xs font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5 font-mono">
          <Sparkles size={14} className="text-amber-400" /> Simulador de Interações
        </h3>
        <span className="text-[11px] text-zinc-400 font-mono bg-dark-800 px-2 py-0.5 rounded border border-dark-700">
          Alvo: {instanciaAtiva.nome}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-zinc-400 mb-1">Usuário Simulado</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="block text-zinc-400 mb-1">Comentário / Nick</label>
          <input
            type="text"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Botões de Ação de Teste */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        <button
          onClick={() => disparar('LIKE')}
          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <Heart size={14} className="text-rose-400" /> +{qtdLikes} Likes
        </button>

        <button
          onClick={() => disparar('COMENTARIO')}
          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <MessageSquare size={14} className="text-blue-400" /> Enviar Chat
        </button>

        <button
          onClick={() => disparar('PRESENTE')}
          className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <Gift size={14} className="text-amber-400" /> Enviar {giftSelecionado}
        </button>
      </div>
    </div>
  );
}