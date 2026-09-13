export class EventBuffer {
  constructor(tamanhoMax = 500) {
    this.tamanhoMax = tamanhoMax;
    this.contador = 0;
    this.eventos = [];
  }

  adicionar(evento) {
    this.contador += 1;
    const registro = {
      ...evento,
      cursor: this.contador,
      recebidoEm: Date.now(),
    };

    this.eventos.push(registro);
    if (this.eventos.length > this.tamanhoMax) {
      this.eventos.shift();
    }
    return registro;
  }

  desde(cursor = 0, limite = 50) {
    const novos = this.eventos.filter((e) => e.cursor > cursor);
    const eventosRetorno = novos.slice(0, limite);

    const novoCursor = eventosRetorno.length > 0 
      ? eventosRetorno[eventosRetorno.length - 1].cursor 
      : cursor;

    return {
      eventos: eventosRetorno,
      cursor: novoCursor,
      pendentes: novos.length - eventosRetorno.length,
      totalEmBuffer: this.eventos.length,
    };
  }

  limpar() {
    this.eventos = [];
    return { limpo: true, ultimoCursor: this.contador };
  }
}