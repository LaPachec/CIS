import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { sendData, sendError } from "./helpers.js";

type LoginBody = {
  email?: string;
  password?: string;
};

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const userSelect = {
  id: true,
  competitionId: true,
  name: true,
  email: true,
  state: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  competition: {
    select: {
      id: true,
      name: true,
      location: true,
    },
  },
};

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? "";
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: LoginBody }>("/auth/login", async (request, reply) => {
    const email = normalizeEmail(request.body?.email);
    const password = request.body?.password ?? "";

    if (!email || !password) {
      return sendError(reply, 400, "Email e senha sao obrigatorios.");
    }

    const expert = await prisma.expert.findUnique({
      where: { email },
      select: {
        id: true,
        competitionId: true,
        name: true,
        email: true,
        state: true,
        role: true,
        isActive: true,
        passwordHash: true,
        competition: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!expert || !expert.isActive || !expert.passwordHash) {
      return sendError(reply, 401, "Email ou senha invalidos.");
    }

    const passwordMatches = await bcrypt.compare(password, expert.passwordHash);

    if (!passwordMatches) {
      return sendError(reply, 401, "Email ou senha invalidos.");
    }

    await prisma.expert.update({
      where: { id: expert.id },
      data: { lastLoginAt: new Date() },
    });

    const user = {
      id: expert.id,
      competitionId: expert.competitionId,
      name: expert.name,
      email: expert.email,
      state: expert.state,
      role: expert.role,
      isActive: expert.isActive,
      competition: expert.competition,
    };
    const token = app.jwt.sign({
      sub: String(expert.id),
      name: expert.name,
      email: expert.email,
      role: expert.role,
      competitionId: expert.competitionId,
    });

    return sendData(reply, { token, user });
  });

  app.get("/auth/me", async (request, reply) => {
    if (!request.user) {
      return sendError(reply, 401, "Autenticacao obrigatoria.");
    }

    const expert = await prisma.expert.findUnique({
      where: { id: request.user.id },
      select: userSelect,
    });

    if (!expert || !expert.isActive) {
      return sendError(reply, 401, "Usuario inativo ou nao encontrado.");
    }

    return sendData(reply, expert);
  });

  app.patch<{ Body: ChangePasswordBody }>("/auth/change-password", async (request, reply) => {
    if (!request.user) {
      return sendError(reply, 401, "Autenticacao obrigatoria.");
    }

    const currentPassword = request.body?.currentPassword ?? "";
    const newPassword = request.body?.newPassword ?? "";
    const confirmPassword = request.body?.confirmPassword ?? "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return sendError(reply, 400, "Informe a senha atual, a nova senha e a confirmacao.");
    }

    if (newPassword.length < 6) {
      return sendError(reply, 400, "A nova senha deve ter pelo menos 6 caracteres.");
    }

    if (newPassword !== confirmPassword) {
      return sendError(reply, 400, "A confirmacao da senha nao confere.");
    }

    const expert = await prisma.expert.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!expert || !expert.isActive || !expert.passwordHash) {
      return sendError(reply, 401, "Usuario inativo ou sem senha cadastrada.");
    }

    const passwordMatches = await bcrypt.compare(currentPassword, expert.passwordHash);

    if (!passwordMatches) {
      return sendError(reply, 400, "Senha atual invalida.");
    }

    await prisma.expert.update({
      where: { id: expert.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
      },
    });

    return sendData(reply, { message: "Senha alterada com sucesso." });
  });
}
