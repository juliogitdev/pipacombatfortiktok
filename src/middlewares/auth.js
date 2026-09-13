import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

// Protege o Dashboard do Admin
export function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const [, token] = authHeader.split(' ');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.adminId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// Protege a rota do Jogo (Roblox / Unity / etc)
export async function authGame(req, res, next) {
  const apiKey = req.headers['x-api-key'] || (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));

  if (!apiKey) {
    return res.status(401).json({ erro: 'API Key do jogo não fornecida.' });
  }

  const instancia = await prisma.instancia.findUnique({
    where: { apiKey },
    include: { regra: true },
  });

  if (!instancia) {
    return res.status(403).json({ erro: 'Instância não encontrada ou API Key inválida.' });
  }

  req.instancia = instancia;
  return next();
}