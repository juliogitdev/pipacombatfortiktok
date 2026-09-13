import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';
import { router } from './routes/apiRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 👉 Serve o Dashboard visual direto pelo servidor
app.use(express.static('dashboard'));

// Rota de Health Check
app.get('/health', (req, res) => res.json({ status: 'ONLINE', timestamp: Date.now() }));

// Rotas da API
app.use('/api', router);

const PORT = process.env.PORT || 3000;

async function criarAdminPadrao() {
  const existe = await prisma.admin.findFirst();
  if (!existe) {
    const senhaHash = bcrypt.hashSync('admin123', 10);
    await prisma.admin.create({
      data: {
        email: 'admin@live.com',
        senha: senhaHash,
      },
    });
    console.log('👤 [ADMIN CRIADO] Usuário: admin@live.com | Senha: admin123');
  }
}

app.listen(PORT, async () => {
  await criarAdminPadrao();
  console.log(`🚀 Gateway rodando em: http://localhost:${PORT}`);
});