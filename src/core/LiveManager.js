import 'dotenv/config';
import { TikTokLive } from 'tiktok-live-api';
import { PrismaClient } from '@prisma/client';
import { EventBuffer } from './EventBuffer.js';
import { RuleEngine } from './RuleEngine.js';
import { rankingManager } from './RankingManager.js';

const prisma = new PrismaClient();

class LiveManager {
  constructor() {
    this.sessoes = new Map();
    this.listeners = new Set();
  }

  // Métodos SSE para o Dashboard
  registrarListener(res) { this.listeners.add(res); }
  removerListener(res) { this.listeners.delete(res); }
  adicionarClienteSSE(res) { this.listeners.add(res); }
  removerClienteSSE(res) { this.listeners.delete(res); }

  emitirLog(instanciaId, payload) {
    const dados = JSON.stringify({
      instanciaId,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      ...payload
    });

    for (const client of this.listeners) {
      try {
        client.write(`data: ${dados}\n\n`);
      } catch (e) {
        this.listeners.delete(client);
      }
    }
  }

  obterOuCriarBuffer(instanciaId) {
    if (!this.sessoes.has(instanciaId)) {
      this.sessoes.set(instanciaId, {
        tiktokConn: null,
        buffer: new EventBuffer(200),
        regras: null,
        status: 'OFFLINE',
        username: null,
        nome: null
      });
    }
    return this.sessoes.get(instanciaId);
  }

  obterStatus(instanciaId) {
    return this.sessoes.get(instanciaId)?.status || 'OFFLINE';
  }

  async iniciar(instanciaId) {
    const instancia = await prisma.instancia.findUnique({
      where: { id: instanciaId },
      include: { regra: true }
    });

    if (!instancia) throw new Error('Instância não encontrada.');

    const sessao = this.obterOuCriarBuffer(instanciaId);
    sessao.regras = instancia.regra;
    sessao.username = instancia.tiktokUsername;
    sessao.nome = instancia.nome;

    if (sessao.status === 'ONLINE' && sessao.tiktokConn) {
      return { status: 'ONLINE', mensagem: 'Transmissão já está conectada.' };
    }

    const usernameLimpo = instancia.tiktokUsername.replace('@', '').trim();
    const apiKey = process.env.TIKTOOL_API_KEY;

    if (!apiKey) {
      throw new Error('TIKTOOL_API_KEY não configurada no arquivo .env.');
    }

    this.emitirLog(instanciaId, { 
      nivel: 'info', 
      texto: `Iniciando conexão via TikTool com @${usernameLimpo}...` 
    });

    // Instancia o cliente da TikTool
    const client = new TikTokLive(usernameLimpo, { apiKey });
    sessao.tiktokConn = client;

    // Normalizador de eventos
    const processar = (tipo, data) => {
      const eventoNormalizado = RuleEngine.normalizar(tipo, data, sessao.regras);
      const eventoFinal = sessao.buffer.adicionar(eventoNormalizado);

      if (eventoFinal.pontos > 0) {
        rankingManager.adicionarPontos(instanciaId, eventoFinal.usuario, eventoFinal.pontos);
      }

      if (tipo === 'COMENTARIO' && eventoFinal.detalhes?.mensagem) {
        const msg = eventoFinal.detalhes.mensagem.trim();
        if (msg.toLowerCase().startsWith('!nick ')) {
          const nick = msg.replace(/^!nick\s+/i, '').trim();
          rankingManager.vincularNickJogo(instanciaId, eventoFinal.usuario.uniqueId, nick);
        }
      }

      this.emitirLog(instanciaId, {
        nivel: 'evento',
        instanciaId,
        instanciaNome: sessao.nome,
        evento: eventoFinal
      });
    };

    // ================= EVENTOS TIKTOOL =================
    // 1. Mensagens de Chat
    client.on('chat', (e) => {
      processar('COMENTARIO', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || '',
        comment: e.comment || ''
      });
    });

    // 2. Presentes (Gifts)
    client.on('gift', (e) => {
      processar('PRESENTE', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || '',
        giftId: e.giftId,
        giftName: e.giftName || 'Presente',
        repeatCount: e.repeatCount || 1,
        diamondCount: e.diamondCount || 1
      });
    });

    // 3. Curtidas (Likes)
    client.on('like', (e) => {
      processar('LIKE', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || '',
        likeCount: e.likeCount || 1
      });
    });

    // 4. Seguidor Novo (Follow)
    client.on('follow', (e) => {
      processar('SEGUIDOR', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || ''
      });
    });

    // 5. Compartilhamento (Share / Social)
    client.on('share', (e) => {
      processar('COMPARTILHAMENTO', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || ''
      });
    });

    client.on('disconnected', () => {
      sessao.status = 'OFFLINE';
      this.emitirLog(instanciaId, { nivel: 'erro', texto: 'A live foi desconectada ou encerrada.' });
    });

    client.on('error', (err) => {
      this.emitirLog(instanciaId, { nivel: 'erro', texto: `Alerta: ${err?.message || err}` });
    });

    try {
      await client.connect();
      sessao.status = 'ONLINE';
      this.emitirLog(instanciaId, { 
        nivel: 'info', 
        texto: `✅ CONECTADO VIA TIKTOOL! Transmissão ao vivo de @${usernameLimpo} monitorada com sucesso.` 
      });
      return { status: 'ONLINE' };
    } catch (err) {
      sessao.status = 'OFFLINE';
      sessao.tiktokConn = null;
      this.emitirLog(instanciaId, { 
        nivel: 'erro', 
        texto: `Falha na conexão: ${err.message}` 
      });
      throw new Error(`Não foi possível conectar: ${err.message}`);
    }
  }

  async parar(instanciaId) {
    const sessao = this.sessoes.get(instanciaId);
    if (!sessao || !sessao.tiktokConn) {
      return { status: 'OFFLINE' };
    }

    try {
      sessao.tiktokConn.disconnect();
    } catch (e) {}

    sessao.tiktokConn = null;
    sessao.status = 'OFFLINE';
    this.emitirLog(instanciaId, { nivel: 'info', texto: 'Desconectado da transmissão.' });

    return { status: 'OFFLINE' };
  }
}

export const liveManager = new LiveManager();