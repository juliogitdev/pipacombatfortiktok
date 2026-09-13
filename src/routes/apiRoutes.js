import { Router } from 'express';
import { adminController } from '../controllers/adminController.js';
import { gameController } from '../controllers/gameController.js';
import { authAdmin, authGame } from '../middlewares/auth.js';
import { rankingManager } from '../core/RankingManager.js';

const router = Router();

// ================= ROTAS DE ADMINISTRAÇÃO =================
router.post('/admin/login', adminController.login);
router.get('/admin/instancias', authAdmin, adminController.listarInstancias);
router.post('/admin/instancias', authAdmin, adminController.criarInstancia);
router.put('/admin/instancias/:id', authAdmin, adminController.atualizarInstancia);
router.delete('/admin/instancias/:id', authAdmin, adminController.deletarInstancia);

router.post('/admin/instancias/:id/iniciar', authAdmin, adminController.iniciarLive);
router.post('/admin/instancias/:id/parar', authAdmin, adminController.pararLive);
router.put('/admin/instancias/:id/regras', authAdmin, adminController.salvarRegras);
router.post('/admin/instancias/:id/simular', authAdmin, adminController.simularEvento);

// Ranking e Logs Administrativos
router.get('/admin/instancias/:id/ranking', authAdmin, (req, res) => {
  const limite = Math.min(Number(req.query.limit) || 10, 50);
  const top = rankingManager.obterTop(req.params.id, limite);
  return res.json({ top });
});

router.post('/admin/instancias/:id/ranking/reset', authAdmin, (req, res) => {
  rankingManager.zerar(req.params.id);
  return res.json({ sucesso: true, mensagem: 'Ranking resetado com sucesso.' });
});

router.get('/admin/logs/stream', adminController.logsStream);

// ================= ROTAS DO JOGO (ENGINE CLIENT) =================
router.get('/v1/game/events', authGame, gameController.puxarEventos);
router.get('/v1/game/ranking', authGame, gameController.obterRanking);
router.post('/v1/game/ranking/reset', authGame, gameController.resetarRanking);
router.get('/v1/game/config', authGame, gameController.obterConfiguracoes);

export { router };
export default router;