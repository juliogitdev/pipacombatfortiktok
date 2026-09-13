export class RuleEngine {
  static normalizar(tipo, dadosBrutos, regras = {}) {
    const base = {
      tipo, // "COMENTARIO", "LIKE", "PRESENTE", "SEGUIDOR", "COMPARTILHAMENTO"
      acao: "PADRAO",
      pontos: 0,
      usuario: {
        uniqueId: dadosBrutos.uniqueId || "anonimo",
        apelido: dadosBrutos.nickname || dadosBrutos.uniqueId || "Espectador",
        avatar: dadosBrutos.profilePictureUrl || "",
      },
      detalhes: {},
    };

    switch (tipo) {
      case 'COMENTARIO': {
        base.acao = "CHAT";
        base.pontos = Number(regras.pontosPorComentario) || 5;
        base.detalhes = {
          mensagem: dadosBrutos.comment || "",
        };
        break;
      }

      case 'LIKE': {
        const quantidade = dadosBrutos.likeCount || 1;
        base.acao = "BOOST";
        base.pontos = (Number(regras.pontosPorLike) || 1) * quantidade;
        base.detalhes = { quantidade };
        break;
      }

      case 'SEGUIDOR': {
        base.acao = "FOLLOW";
        base.pontos = Number(regras.pontosPorFollow) || 50;
        break;
      }

      case 'COMPARTILHAMENTO': {
        base.acao = "SHARE";
        base.pontos = Number(regras.pontosPorShare) || 20;
        break;
      }

      case 'PRESENTE': {
        const giftId = Number(dadosBrutos.giftId);
        const quantidade = Number(dadosBrutos.repeatCount) || 1;
        const presentesConfig = Array.isArray(regras.configPresentes) ? regras.configPresentes : [];

        const regraPresente = presentesConfig.find((p) => Number(p.giftId) === giftId);

        if (regraPresente) {
          base.acao = regraPresente.acao || "PRESENTE_ESPECIAL";
          base.pontos = (Number(regraPresente.pontos) || 10) * quantidade;
        } else {
          const diamondCost = Number(dadosBrutos.diamondCount) || 1;
          base.acao = "PRESENTE_GENERICO";
          base.pontos = diamondCost * 10 * quantidade;
        }

        base.detalhes = {
          giftId,
          giftName: dadosBrutos.giftName || "Gift",
          quantidade,
          diamantes: dadosBrutos.diamondCount || 1,
        };
        break;
      }
    }

    return base;
  }
}