import { rankingManager } from '../core/RankingManager.js';
import { liveManager } from '../core/LiveManager.js';

export const gameController = {
  // GET /api/v1/game/events?cursor=0&limit=30
  puxarEventos(req, res) {
    const instanciaId = req.instancia.id;
    const cursor = Number(req.query.cursor) || 0;
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    const buffer = liveManager.obterOuCriarBuffer(instanciaId).buffer;
    const resposta = buffer.desde(cursor, limit);

    return res.json({
      statusLive: liveManager.obterStatus(instanciaId),
      ...resposta,
    });
  },

  // GET /api/v1/game/ranking?limit=10
  obterRanking(req, res) {
    const instanciaId = req.instancia.id;
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const top = rankingManager.obterTop(instanciaId, limit);

    return res.json({
      instancia: req.instancia.nome,
      top,
    });
  },

  // POST /api/v1/game/ranking/reset (Chamado pelo Jogo no final da rodada)
  resetarRanking(req, res) {
    const instanciaId = req.instancia.id;
    const manterNicks = req.body?.manterNicks !== false; // Padrão: true

    rankingManager.zerar(instanciaId, manterNicks);

    // Notifica o Dashboard em tempo real que o jogo iniciou novo ciclo
    liveManager.emitirLog(instanciaId, {
      nivel: 'info',
      texto: `🔄 [JOGO] Novo ciclo iniciado! As pontuações foram zeradas para a nova partida.`
    });

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Ciclo de ranking resetado com sucesso.',
      instancia: req.instancia.nome,
      timestamp: Date.now()
    });
  },

  // GET /api/v1/game/config
  obterConfiguracoes(req, res) {
    return res.json({
      instancia: req.instancia.nome,
      tiktokUsername: req.instancia.tiktokUsername,
      regras: req.instancia.regra,
    });
  },
};