import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './lib/prisma.js';
import { router } from './routes/apiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const dashboardDir = path.resolve(__dirname, '../dashboard');
const reactDistDir = path.resolve(__dirname, '../live-dashboard/dist');
const hasReactBuild = existsSync(path.join(reactDistDir, 'index.html'));

app.use(cors());
app.use(express.json());

// Serve o build do React na raiz do site, quando disponível.
if (hasReactBuild) {
  app.use(express.static(reactDistDir));
}

// Mantém o dashboard estático legado em um caminho específico.
app.use('/dashboard', express.static(dashboardDir));

// Rota de Health Check
app.get('/health', (req, res) => res.json({ status: 'ONLINE', timestamp: Date.now() }));

// Rotas da API
app.use('/api', router);

if (hasReactBuild) {
  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(reactDistDir, 'index.html'));
  });
}

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