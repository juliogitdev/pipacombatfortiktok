import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { liveManager } from '../core/LiveManager.js';
import { RuleEngine } from '../core/RuleEngine.js';
import { rankingManager } from '../core/RankingManager.js';

const prisma = new PrismaClient();

export const adminController = {
  // POST /api/admin/login
  async login(req, res) {
    const { email, senha } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@live.com';
    const adminSenha = process.env.ADMIN_PASSWORD || 'admin123';
    const jwtSecret = process.env.JWT_SECRET || 'secret_live_gateway_2026';

    if (email === adminEmail && senha === adminSenha) {
      const token = jwt.sign({ email, role: 'ADMIN' }, jwtSecret, { expiresIn: '7d' });
      return res.json({ token, usuario: { email } });
    }

    return res.status(401).json({ erro: 'Credenciais inválidas.' });
  },

  // GET /api/admin/instancias
  async listarInstancias(req, res) {
    try {
      const instancias = await prisma.instancia.findMany({
        include: { regra: true },
        orderBy: { criadoEm: 'desc' },
      });

      const formatadas = instancias.map((inst) => ({
        ...inst,
        statusTempoReal: liveManager.obterStatus(inst.id),
      }));

      return res.json(formatadas);
    } catch (err) {
      return res.status(500).json({ erro: 'Erro ao buscar instâncias: ' + err.message });
    }
  },

  // POST /api/admin/instancias
  async criarInstancia(req, res) {
    const { nome, tiktokUsername } = req.body;
    if (!nome || !tiktokUsername) {
      return res.status(400).json({ erro: 'Nome e TikTok Username são obrigatórios.' });
    }

    try {
      const nova = await prisma.instancia.create({
        data: {
          nome,
          tiktokUsername: tiktokUsername.replace('@', '').trim(),
          regra: {
            create: {
              pontosPorComentario: 5,
              pontosPorLike: 1,
              pontosPorFollow: 50,
              pontosPorShare: 20,
            },
          },
        },
        include: { regra: true },
      });

      return res.status(201).json(nova);
    } catch (err) {
      return res.status(500).json({ erro: 'Erro ao criar instância: ' + err.message });
    }
  },

  // PUT /api/admin/instancias/:id
  async atualizarInstancia(req, res) {
    const { id } = req.params;
    const { nome, tiktokUsername } = req.body;

    try {
      const atualizada = await prisma.instancia.update({
        where: { id },
        data: {
          ...(nome ? { nome } : {}),
          ...(tiktokUsername ? { tiktokUsername: tiktokUsername.replace('@', '').trim() } : {}),
        },
        include: { regra: true },
      });

      return res.json(atualizada);
    } catch (err) {
      return res.status(500).json({ erro: 'Erro ao atualizar instância: ' + err.message });
    }
  },

  // DELETE /api/admin/instancias/:id
  async deletarInstancia(req, res) {
    const { id } = req.params;

    try {
      await liveManager.parar(id);
      await prisma.regraInstancia.deleteMany({ where: { instanciaId: id } });
      await prisma.instancia.delete({ where: { id } });

      return res.json({ sucesso: true, mensagem: 'Instância removida com sucesso.' });
    } catch (err) {
      return res.status(500).json({ erro: 'Erro ao excluir instância: ' + err.message });
    }
  },

  // PUT /api/admin/instancias/:id/regras
  async salvarRegras(req, res) {
    const { id } = req.params;
    const { pontosPorComentario, pontosPorLike, pontosPorFollow, pontosPorShare } = req.body;

    try {
      const regraAtualizada = await prisma.regraInstancia.upsert({
        where: { instanciaId: id },
        update: {
          pontosPorComentario: Number(pontosPorComentario) || 5,
          pontosPorLike: Number(pontosPorLike) || 1,
          pontosPorFollow: Number(pontosPorFollow) || 50,
          pontosPorShare: Number(pontosPorShare) || 20,
        },
        create: {
          instanciaId: id,
          pontosPorComentario: Number(pontosPorComentario) || 5,
          pontosPorLike: Number(pontosPorLike) || 1,
          pontosPorFollow: Number(pontosPorFollow) || 50,
          pontosPorShare: Number(pontosPorShare) || 20,
        },
      });

      // Atualiza na sessão em memória se a live estiver aberta
      const sessao = liveManager.obterOuCriarBuffer(id);
      sessao.regras = regraAtualizada;

      return res.json(regraAtualizada);
    } catch (err) {
      return res.status(500).json({ erro: 'Erro ao salvar regras: ' + err.message });
    }
  },

  // POST /api/admin/instancias/:id/iniciar
  async iniciarLive(req, res) {
    try {
      const resultado = await liveManager.iniciar(req.params.id);
      return res.json(resultado);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  },

  // POST /api/admin/instancias/:id/parar
  async pararLive(req, res) {
    try {
      const resultado = await liveManager.parar(req.params.id);
      return res.json(resultado);
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  },

  // POST /api/admin/instancias/:id/simular
  async simularEvento(req, res) {
    const { id } = req.params;
    const { tipo, usuario, comentario, giftName, diamantes, quantidade } = req.body;

    try {
      const sessao = liveManager.obterOuCriarBuffer(id);
      const payload = {
        uniqueId: usuario || 'simulador',
        nickname: usuario || 'Simulador Player',
        avatar: '',
        comment: comentario,
        giftName,
        repeatCount: quantidade || 1,
        diamondCount: diamantes || 1,
        likeCount: quantidade || 1,
      };

      const eventoNormalizado = RuleEngine.normalizar(tipo, payload, sessao.regras);
      const eventoFinal = sessao.buffer.adicionar(eventoNormalizado);

      if (eventoFinal.pontos > 0) {
        rankingManager.adicionarPontos(id, eventoFinal.usuario, eventoFinal.pontos);
      }

      if (tipo === 'COMENTARIO' && eventoFinal.detalhes?.mensagem) {
        const msg = eventoFinal.detalhes.mensagem.trim();
        if (msg.toLowerCase().startsWith('!nick ')) {
          const nick = msg.replace(/^!nick\s+/i, '').trim();
          rankingManager.vincularNickJogo(id, eventoFinal.usuario.uniqueId, nick);
        }
      }

      liveManager.emitirLog(id, {
        nivel: 'evento',
        instanciaId: id,
        instanciaNome: sessao.nome || 'Simulador',
        evento: eventoFinal,
      });

      return res.json({ sucesso: true, evento: eventoFinal });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  },

  // GET /api/admin/logs/stream (Server-Sent Events)
  logsStream(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    liveManager.adicionarClienteSSE(res);

    req.on('close', () => {
      liveManager.removerClienteSSE(res);
    });
  },
};