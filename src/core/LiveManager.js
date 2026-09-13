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

    const usernameLimpo = String(instancia.tiktokUsername || '').replace('@', '').trim();

    if (!usernameLimpo) {
      throw new Error('O username do TikTok da instância está vazio.');
    }

    const apiKey = String(process.env.TIKTOOL_API_KEY || '').trim();

    if (!apiKey) {
      throw new Error('TIKTOOL_API_KEY não configurada. Configure a variável de ambiente em Render ou no .env local.');
    }

    this.emitirLog(instanciaId, {
      nivel: 'info',
      texto: `Iniciando conexão via TikTool com @${usernameLimpo}...`
    });

    const client = new TikTokLive(usernameLimpo, { apiKey });
    sessao.tiktokConn = client;
    sessao.status = 'CONNECTING';

    const processar = (tipo, data) => {
      const eventoNormalizado = RuleEngine.normalizar(tipo, data, sessao.regras);
      const eventoFinal = sessao.buffer.adicionar(eventoNormalizado);

      if (eventoFinal.pontos > 0) {
        rankingManager.adicionarPontos(instanciaId, eventoFinal.usuario, eventoFinal.pontos);
      }

      if (tipo === 'COMENTARIO' && eventoFinal.detalhes?.mensagem) {
        const msg = String(eventoFinal.detalhes.mensagem || '').trim();
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

    client.on('error', (err) => {
      const mensagem = err?.message || err || 'Erro desconhecido do TikTool.';
      this.emitirLog(instanciaId, { nivel: 'erro', texto: `Alerta: ${mensagem}` });
    });

    client.on('chat', (e) => {
      processar('COMENTARIO', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || '',
        comment: e.comment || ''
      });
    });

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

    client.on('like', (e) => {
      processar('LIKE', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || '',
        likeCount: e.likeCount || 1
      });
    });

    client.on('follow', (e) => {
      processar('SEGUIDOR', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || ''
      });
    });

    client.on('share', (e) => {
      processar('COMPARTILHAMENTO', {
        uniqueId: e.user?.uniqueId || 'anonimo',
        nickname: e.user?.nickname || e.user?.uniqueId || 'Anônimo',
        avatar: e.user?.profilePictureUrl || ''
      });
    });

    client.on('connected', () => {
      sessao.status = 'ONLINE';
      this.emitirLog(instanciaId, {
        nivel: 'info',
        texto: `✅ CONECTADO VIA TIKTOOL! Transmissão ao vivo de @${usernameLimpo} monitorada com sucesso.`
      });
    });

    client.on('disconnected', ({ code } = {}) => {
      sessao.status = 'OFFLINE';
      sessao.tiktokConn = null;
      this.emitirLog(instanciaId, {
        nivel: 'erro',
        texto: `A live foi desconectada ou encerrada (código ${code ?? 'desconhecido'}).`
      });
    });

    try {
      await client.connect();
      return { status: 'ONLINE' };
    } catch (err) {
      sessao.status = 'OFFLINE';
      sessao.tiktokConn = null;
      const mensagem = err?.message || String(err);
      this.emitirLog(instanciaId, {
        nivel: 'erro',
        texto: `Falha na conexão: ${mensagem}`
      });
      throw new Error(`Não foi possível conectar com @${usernameLimpo}: ${mensagem}`);
    }
  }

  async parar(instanciaId) {
    const sessao = this.sessoes.get(instanciaId);

    if (!sessao) {
      return { status: 'OFFLINE' };
    }

    if (sessao.tiktokConn) {
      try {
        sessao.tiktokConn.disconnect();
      } catch (e) {
        this.emitirLog(instanciaId, {
          nivel: 'erro',
          texto: `Erro ao encerrar conexão manualmente: ${e?.message || e}`
        });
      }
    }

    sessao.tiktokConn = null;
    sessao.status = 'OFFLINE';
    this.emitirLog(instanciaId, { nivel: 'info', texto: 'Desconectado da transmissão.' });

    return { status: 'OFFLINE' };
  }
}

export const liveManager = new LiveManager();