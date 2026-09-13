import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, Terminal, Plus, Power, RefreshCw, Copy, Check, 
  Trash2, Sparkles, MessageSquare, Heart, Gift, Pencil, 
  Settings2, Trophy, Crown, RotateCcw, Gamepad2 
} from 'lucide-react';

const API_URL = '/api';

// ==================== API SERVICE ====================
const api = {
  getToken() {
    return localStorage.getItem('gw_token');
  },
  async request(path, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
    return data;
  },
  login(email, senha) {
    return this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
  },
  listarInstancias() {
    return this.request('/admin/instancias');
  },
  criarInstancia(nome, tiktokUsername) {
    return this.request('/admin/instancias', {
      method: 'POST',
      body: JSON.stringify({ nome, tiktokUsername }),
    });
  },
  atualizarInstancia(id, dados) {
    return this.request(`/admin/instancias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
  },
  deletarInstancia(id) {
    return this.request(`/admin/instancias/${id}`, {
      method: 'DELETE',
    });
  },
  iniciarLive(id) {
    return this.request(`/admin/instancias/${id}/iniciar`, { method: 'POST' });
  },
  pararLive(id) {
    return this.request(`/admin/instancias/${id}/parar`, { method: 'POST' });
  },
  salvarRegras(id, regras) {
    return this.request(`/admin/instancias/${id}/regras`, {
      method: 'PUT',
      body: JSON.stringify(regras),
    });
  },
  simularEvento(id, payload) {
    return this.request(`/admin/instancias/${id}/simular`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  obterRanking(id) {
    return this.request(`/admin/instancias/${id}/ranking`);
  },
  zerarRanking(id) {
    return this.request(`/admin/instancias/${id}/ranking/reset`, {
      method: 'POST',
    });
  },
  conectarStreamLogs(onMessage) {
    const es = new EventSource(`${API_URL}/admin/logs/stream`);
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onMessage(parsed);
      } catch (err) {
        console.error("Erro no SSE:", err);
      }
    };
    return () => es.close();
  }
};

// ==================== MODAL DE REGRAS ====================
function ModalRegras({ instancia, onClose, onSalvo }) {
  const [comentario, setComentario] = useState(instancia.regra?.pontosPorComentario || 5);
  const [like, setLike] = useState(instancia.regra?.pontosPorLike || 1);
  const [follow, setFollow] = useState(instancia.regra?.pontosPorFollow || 50);
  const [share, setShare] = useState(instancia.regra?.pontosPorShare || 20);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.salvarRegras(instancia.id, {
      pontosPorComentario: Number(comentario),
      pontosPorLike: Number(like),
      pontosPorFollow: Number(follow),
      pontosPorShare: Number(share),
    });
    onSalvo();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#121214] border border-zinc-800 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings2 size={16} className="text-indigo-400" /> Regras de Pontuação: {instancia.nome}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 mb-1">Pts / Comentário</label>
              <input 
                type="number" 
                value={comentario} 
                onChange={(e) => setComentario(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Pts / Curtida</label>
              <input 
                type="number" 
                value={like} 
                onChange={(e) => setLike(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Pts / Seguidor</label>
              <input 
                type="number" 
                value={follow} 
                onChange={(e) => setFollow(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-zinc-400 mb-1">Pts / Compartilhamento</label>
              <input 
                type="number" 
                value={share} 
                onChange={(e) => setShare(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1.5 focus:border-indigo-500" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg">Salvar Regras</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== MODAL DE EDITAR INSTÂNCIA ====================
function ModalEditarInstancia({ instancia, onClose, onSalvo }) {
  const [nome, setNome] = useState(instancia.nome);
  const [tiktokUsername, setTiktokUsername] = useState(instancia.tiktokUsername);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.atualizarInstancia(instancia.id, { nome, tiktokUsername });
    onSalvo();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-[#121214] border border-zinc-800 w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Pencil size={16} className="text-indigo-400" /> Editar Canal / Jogo
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1">Nome de Identificação</label>
            <input 
              type="text" 
              required
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-2 focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-zinc-400 mb-1">TikTok Username (sem @)</label>
            <input 
              type="text" 
              required
              value={tiktokUsername} 
              onChange={(e) => setTiktokUsername(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-2 focus:border-indigo-500" 
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-zinc-400 hover:text-white">Cancelar</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg">Salvar Alterações</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==================== COMPONENTE: RANKING & PÓDIO ====================
function RankingBoard({ instancia, ranking, onAtualizar, onZerar }) {
  if (!instancia) return null;

  const top1 = ranking[0];
  const top2 = ranking[1];
  const top3 = ranking[2];
  const restante = ranking.slice(3);

  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col h-[520px] overflow-hidden">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          <h3 className="font-bold text-sm text-white">Ranking: {instancia.nome}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onAtualizar}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-700 rounded-lg transition"
            title="Recarregar Ranking"
          >
            <RefreshCw size={13} />
          </button>
          <button 
            onClick={onZerar}
            className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
          >
            <RotateCcw size={13} /> Zerar Partida
          </button>
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2">
          <Trophy size={32} className="opacity-20" />
          <p>Nenhum ponto registrado nesta instância ainda.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-5 pt-3">
          <div className="grid grid-cols-3 gap-2.5 items-end pt-4 pb-2">
            {/* Top 2 */}
            <div className="bg-zinc-900/80 border border-zinc-700/60 rounded-xl p-3 text-center flex flex-col items-center">
              <span className="text-zinc-400 font-black text-xs">#2</span>
              <p className="font-bold text-xs text-white truncate max-w-full mt-1">{top2 ? top2.nickname : '-'}</p>
              <span className="text-[11px] text-amber-300 font-mono mt-0.5">{top2 ? `${top2.pontos} pts` : '0'}</span>
              {top2?.nickJogo && (
                <span className="text-[10px] text-indigo-400 font-mono mt-1 bg-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Gamepad2 size={10} /> {top2.nickJogo}
                </span>
              )}
            </div>

            {/* Top 1 */}
            <div className="bg-gradient-to-b from-amber-500/20 to-zinc-900 border border-amber-500/40 rounded-xl p-3.5 text-center flex flex-col items-center -translate-y-2 shadow-lg shadow-amber-500/5">
              <Crown size={20} className="text-amber-400 mb-0.5" />
              <span className="text-amber-400 font-black text-xs">#1 LÍDER</span>
              <p className="font-bold text-sm text-white truncate max-w-full mt-1">{top1 ? top1.nickname : '-'}</p>
              <span className="text-xs text-amber-300 font-mono font-bold mt-0.5">{top1 ? `${top1.pontos} pts` : '0'}</span>
              {top1?.nickJogo && (
                <span className="text-[10px] text-indigo-300 font-mono mt-1 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Gamepad2 size={10} /> {top1.nickJogo}
                </span>
              )}
            </div>

            {/* Top 3 */}
            <div className="bg-zinc-900/80 border border-amber-800/40 rounded-xl p-3 text-center flex flex-col items-center">
              <span className="text-amber-600 font-black text-xs">#3</span>
              <p className="font-bold text-xs text-white truncate max-w-full mt-1">{top3 ? top3.nickname : '-'}</p>
              <span className="text-[11px] text-amber-300 font-mono mt-0.5">{top3 ? `${top3.pontos} pts` : '0'}</span>
              {top3?.nickJogo && (
                <span className="text-[10px] text-indigo-400 font-mono mt-1 bg-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Gamepad2 size={10} /> {top3.nickJogo}
                </span>
              )}
            </div>
          </div>

          {restante.length > 0 && (
            <div className="space-y-1.5">
              {restante.map((item) => (
                <div key={item.uniqueId} className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-zinc-500 font-bold w-4">#{item.posicao}</span>
                    <span className="font-semibold text-white">{item.nickname}</span>
                    {item.nickJogo && (
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                        <Gamepad2 size={10} /> {item.nickJogo}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-amber-300 font-bold">{item.pontos} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== APP PRINCIPAL ====================
export default function App() {
  const [token, setToken] = useState(api.getToken());
  const [instancias, setInstancias] = useState([]);
  const [instanciaAtivaId, setInstanciaAtivaId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [copiadoId, setCopiadoId] = useState(null);

  const [abaAtiva, setAbaAtiva] = useState('TERMINAL');
  const [rankingAtivo, setRankingAtivo] = useState([]);

  // Modais de Controle
  const [modalCriarAberta, setModalCriarAberta] = useState(false);
  const [instanciaParaEditar, setInstanciaParaEditar] = useState(null);
  const [instanciaParaRegras, setInstanciaParaRegras] = useState(null);

  // Inputs
  const [novoNome, setNovoNome] = useState('');
  const [novoUserTikTok, setNovoUserTikTok] = useState('');
  const [email, setEmail] = useState('admin@live.com');
  const [senha, setSenha] = useState('admin123');
  const [erroLogin, setErroLogin] = useState('');

  const carregarInstancias = async () => {
    try {
      const lista = await api.listarInstancias();
      setInstancias(lista);
      if (lista.length > 0 && !instanciaAtivaId) {
        setInstanciaAtivaId(lista[0].id);
      }
    } catch (err) {
      if (err.message.includes('Token')) setToken(null);
    }
  };

  const carregarRanking = async (instanciaId) => {
    if (!instanciaId) return;
    try {
      const res = await api.obterRanking(instanciaId);
      setRankingAtivo(res.top || []);
    } catch (err) {
      console.error("Erro ao carregar ranking:", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    carregarInstancias();

    const unsubscribe = api.conectarStreamLogs((log) => {
      setLogs((antigos) => [...antigos.slice(-400), log]);
      if (log.nivel === 'evento') {
        carregarRanking(instanciaAtivaId);
      }
    });

    return () => unsubscribe();
  }, [token, instanciaAtivaId]);

  useEffect(() => {
    if (instanciaAtivaId) {
      carregarRanking(instanciaAtivaId);
    }
  }, [instanciaAtivaId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.login(email, senha);
      localStorage.setItem('gw_token', res.token);
      setToken(res.token);
    } catch (err) {
      setErroLogin(err.message);
    }
  };

  const handleCriarInstancia = async (e) => {
    e.preventDefault();
    if (!novoNome || !novoUserTikTok) return;
    await api.criarInstancia(novoNome, novoUserTikTok);
    setModalCriarAberta(false);
    setNovoNome('');
    setNovoUserTikTok('');
    await carregarInstancias();
  };

  const handleExcluirInstancia = async (inst) => {
    if (!window.confirm(`Tem certeza que deseja apagar "${inst.nome}"?`)) return;
    try {
      await api.deletarInstancia(inst.id);
      if (instanciaAtivaId === inst.id) setInstanciaAtivaId(null);
      await carregarInstancias();
    } catch (err) {
      alert(`Erro: ${err.message}`);
    }
  };

  const alternarConexaoLive = async (inst) => {
    const online = inst.statusTempoReal === 'ONLINE';
    try {
      if (online) {
        await api.pararLive(inst.id);
      } else {
        await api.iniciarLive(inst.id);
      }
      await carregarInstancias();
    } catch (err) {
      alert(`Aviso de Conexão: ${err.message}`);
      await carregarInstancias();
    }
  };

  const handleZerarRanking = async () => {
    if (!instanciaAtivaId) return;
    if (!window.confirm('Deseja zerar as pontuações e iniciar uma nova partida?')) return;
    await api.zerarRanking(instanciaAtivaId);
    await carregarRanking(instanciaAtivaId);
  };

  const copiarKey = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const instanciaAtiva = instancias.find(i => i.id === instanciaAtivaId) || instancias[0];

  if (!token) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121214] border border-zinc-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl text-white">⚡</div>
            <div>
              <h1 className="text-xl font-bold text-white">Live Gateway Suite</h1>
              <p className="text-xs text-zinc-400">Painel Profissional Multi-Live</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">E-mail</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Senha</label>
              <input 
                type="password" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500" 
              />
            </div>
            {erroLogin && <p className="text-xs text-rose-500">{erroLogin}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition text-sm">
              Entrar no Gateway
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col font-sans">
      <header className="bg-[#121214] border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white">⚡</div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">LIVE GATEWAY MASTER</h1>
            <p className="text-[10px] text-zinc-400 font-mono">Central de Comando Multi-Live</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setModalCriarAberta(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Plus size={15} /> Nova Live / Jogo
          </button>
          <button 
            onClick={() => { localStorage.clear(); setToken(null); }}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl transition border border-zinc-700"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Instâncias */}
        <section className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Canais & Jogos ({instancias.length})
            </h2>
            <button onClick={carregarInstancias} className="text-zinc-500 hover:text-zinc-300">
              <RefreshCw size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {instancias.map((inst) => {
              const isOnline = inst.statusTempoReal === 'ONLINE';
              const isSelected = instanciaAtivaId === inst.id;

              return (
                <div 
                  key={inst.id}
                  onClick={() => setInstanciaAtivaId(inst.id)}
                  className={`cursor-pointer rounded-2xl p-4 border transition ${
                    isSelected 
                      ? 'bg-[#18181b] border-indigo-500/80 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/50' 
                      : 'bg-[#121214] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`}></span>
                      <h3 className="font-bold text-sm text-white">{inst.nome}</h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setInstanciaParaEditar(inst); }}
                        title="Editar"
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setInstanciaParaRegras(inst); }}
                        title="Regras"
                        className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Settings2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExcluirInstancia(inst); }}
                        title="Excluir"
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-zinc-400">Canal: <span className="text-zinc-200 font-mono">@{inst.tiktokUsername}</span></p>
                    <button
                      onClick={(e) => { e.stopPropagation(); alternarConexaoLive(inst); }}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition ${
                        isOnline 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      <Power size={12} /> {isOnline ? 'Desconectar' : 'Ligar TikTok'}
                    </button>
                  </div>

                  <div className="bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[200px]">
                      Key: {inst.apiKey}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); copiarKey(inst.apiKey, inst.id); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 ml-2"
                    >
                      {copiadoId === inst.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Coluna Direita: Alternador (Terminal / Ranking) + Simulador */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setAbaAtiva('TERMINAL')}
              className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition ${
                abaAtiva === 'TERMINAL'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Terminal size={14} /> Terminal de Eventos
            </button>
            <button
              onClick={() => setAbaAtiva('RANKING')}
              className={`text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition ${
                abaAtiva === 'RANKING'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Trophy size={14} /> Ranking / Pódio da Partida
            </button>
          </div>

          {abaAtiva === 'TERMINAL' ? (
            <div className="bg-[#121214] border border-zinc-800 rounded-2xl flex flex-col h-[520px] shadow-2xl overflow-hidden">
              <div className="bg-[#18181b] px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-xs font-bold text-zinc-300 uppercase font-mono">Live Feed</span>
                  <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">{logs.length}</span>
                </div>
                <button onClick={() => setLogs([])} className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="flex-1 p-4 font-mono text-[12px] space-y-2 overflow-y-auto bg-black/40 select-text">
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2">
                    <Radio size={24} className="animate-pulse" />
                    <p>Aguardando eventos da transmissão...</p>
                  </div>
                ) : (
                  logs.map((log, index) => {
                    const instNome = instancias.find(i => i.id === log.instanciaId)?.nome || log.instanciaNome || "Live";

                    if (log.nivel === 'evento') {
                      const ev = log.evento;
                      return (
                        <div key={index} className="flex items-start gap-2 hover:bg-zinc-800/40 p-1 rounded transition">
                          <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                          <span className="bg-zinc-800 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded font-bold">{instNome}</span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">{ev.tipo}</span>
                          <span className="text-zinc-200 font-semibold">{ev.usuario.apelido}</span>
                          <span className="text-zinc-500">→</span>
                          <span className="text-amber-300 font-medium">+{ev.pontos} pts</span>
                          <span className="text-zinc-400 font-mono text-[11px] bg-zinc-900 px-1.5 rounded border border-zinc-800">{ev.acao}</span>
                          {ev.detalhes?.mensagem && <span className="text-zinc-400 italic">"{ev.detalhes.mensagem}"</span>}
                        </div>
                      );
                    }

                    return (
                      <div key={index} className="flex items-center gap-2 p-1 text-zinc-400">
                        <span className="text-zinc-600">[{log.timestamp}]</span>
                        <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded">{instNome}</span>
                        <span className={log.nivel === 'erro' ? 'text-rose-400' : 'text-zinc-400'}>{log.texto}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <RankingBoard 
              instancia={instanciaAtiva} 
              ranking={rankingAtivo} 
              onAtualizar={() => carregarRanking(instanciaAtivaId)}
              onZerar={handleZerarRanking}
            />
          )}

          {instanciaAtiva && (
            <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-xs font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5 font-mono">
                  <Sparkles size={14} className="text-amber-400" /> Simulador: {instanciaAtiva.nome}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  onClick={() => api.simularEvento(instanciaAtiva.id, { tipo: 'LIKE', quantidade: 5 })}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Heart size={14} className="text-rose-400" /> +5 Likes
                </button>
                <button
                  onClick={() => api.simularEvento(instanciaAtiva.id, { 
                    tipo: 'COMENTARIO', 
                    usuario: 'GamerTop', 
                    comentario: '!nick PlayerPro123' 
                  })}
                  className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <MessageSquare size={14} className="text-blue-400" /> Enviar !nick
                </button>
                <button
                  onClick={() => api.simularEvento(instanciaAtiva.id, { 
                    tipo: 'PRESENTE', 
                    usuario: 'GamerTop', 
                    giftName: 'Rosa', 
                    quantidade: 1 
                  })}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Gift size={14} className="text-amber-400" /> Presente (Rosa)
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Modal Nova Instância */}
      {modalCriarAberta && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#121214] border border-zinc-800 w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Criar Nova Instância</h3>
            <form onSubmit={handleCriarInstancia} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nome do Jogo / Transmissão</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Arena PVP"
                  value={novoNome} 
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">TikTok Username</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: seu_usuario"
                  value={novoUserTikTok} 
                  onChange={(e) => setNovoUserTikTok(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalCriarAberta(false)} className="text-xs px-3 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                <button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-500 font-bold text-white px-4 py-2 rounded-xl transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Instância */}
      {instanciaParaEditar && (
        <ModalEditarInstancia 
          instancia={instanciaParaEditar} 
          onClose={() => setInstanciaParaEditar(null)} 
          onSalvo={carregarInstancias} 
        />
      )}

      {/* Modal Editar Regras */}
      {instanciaParaRegras && (
        <ModalRegras 
          instancia={instanciaParaRegras} 
          onClose={() => setInstanciaParaRegras(null)} 
          onSalvo={carregarInstancias} 
        />
      )}
    </div>
  );
}