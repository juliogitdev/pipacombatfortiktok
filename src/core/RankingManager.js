export class RankingManager {
  constructor() {
    // Map: [instanciaId] -> Map<uniqueId, { uniqueId, nickname, nickJogo, pontos, avatar, atualizadoEm }>
    this.rankings = new Map();
  }

  obterTabela(instanciaId) {
    if (!this.rankings.has(instanciaId)) {
      this.rankings.set(instanciaId, new Map());
    }
    return this.rankings.get(instanciaId);
  }

  adicionarPontos(instanciaId, usuario, pontos) {
    if (!pontos || pontos <= 0) return;

    const tabela = this.obterTabela(instanciaId);
    const id = usuario.uniqueId;
    const existente = tabela.get(id) || {
      uniqueId: id,
      nickname: usuario.apelido || id,
      avatar: usuario.avatar || '',
      nickJogo: null,
      pontos: 0,
    };

    existente.pontos += pontos;
    existente.nickname = usuario.apelido || existente.nickname;
    existente.avatar = usuario.avatar || existente.avatar;
    existente.atualizadoEm = Date.now();

    tabela.set(id, existente);
    return existente;
  }

  vincularNickJogo(instanciaId, uniqueId, nickJogo) {
    const tabela = this.obterTabela(instanciaId);
    const registro = tabela.get(uniqueId);
    if (registro) {
      registro.nickJogo = nickJogo.trim();
      return true;
    } else {
      // Se ele mandou !nick antes de pontuar, já guarda o registro
      tabela.set(uniqueId, {
        uniqueId,
        nickname: uniqueId,
        avatar: '',
        nickJogo: nickJogo.trim(),
        pontos: 0,
        atualizadoEm: Date.now()
      });
      return true;
    }
  }

  obterTop(instanciaId, limite = 10) {
    const tabela = this.obterTabela(instanciaId);
    const lista = Array.from(tabela.values());

    return lista
      .filter((item) => item.pontos > 0) // Só entra no pódio quem já pontuou na rodada
      .sort((a, b) => b.pontos - a.pontos)
      .slice(0, limite)
      .map((item, index) => ({
        posicao: index + 1,
        ...item,
      }));
  }

  zerar(instanciaId, manterNicks = true) {
    const tabela = this.obterTabela(instanciaId);
    if (!manterNicks) {
      tabela.clear();
      return;
    }

    // Zera os pontos de todos os jogadores para o novo ciclo, mas mantém os nicks salvos
    for (const [id, jogador] of tabela.entries()) {
      jogador.pontos = 0;
      jogador.atualizadoEm = Date.now();
    }
  }
}

export const rankingManager = new RankingManager();