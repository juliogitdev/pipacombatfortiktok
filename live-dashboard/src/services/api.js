const BASE_URL = '/api';

export const api = {
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

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
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

  conectarStreamLogs(onMessage) {
    const es = new EventSource(`${BASE_URL}/admin/logs/stream`);
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onMessage(parsed);
      } catch (err) {
        console.error("Erro no parse de log:", err);
      }
    };
    return () => es.close();
  }
};