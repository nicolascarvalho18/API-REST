import argon2 from "argon2";
import { UserRepository } from "../repositories/UserRepository.js";
import { AppError } from "../utils/AppError.js";

const ensureOwner = (actor, id) => {
  if (actor.id !== id)
    throw new AppError(
      403,
      "FORBIDDEN",
      "Você não tem permissão para acessar este usuário.",
    );
};

export const UserService = {
  async create(data) {
    const { password, ...userData } = data;
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    try {
      return await UserRepository.create({ ...userData, passwordHash });
    } catch (error) {
      if (error.code === "P2002")
        throw new AppError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "Este e-mail já está cadastrado.",
        );
      throw error;
    }
  },
  async get(id, actor) {
    ensureOwner(actor, id);
    const user = await UserRepository.findById(id);
    if (!user)
      throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado.");
    return user;
  },
  async update(id, data, actor) {
    ensureOwner(actor, id);
    if (!(await UserRepository.findById(id)))
      throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado.");
    try {
      return await UserRepository.update(id, data);
    } catch (error) {
      if (error.code === "P2002")
        throw new AppError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "Este e-mail já está cadastrado.",
        );
      if (error.code === "P2025")
        throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado.");
      throw error;
    }
  },
  async delete(id, actor) {
    ensureOwner(actor, id);
    try {
      await UserRepository.delete(id);
    } catch (error) {
      if (error.code === "P2025")
        throw new AppError(404, "USER_NOT_FOUND", "Usuário não encontrado.");
      throw error;
    }
  },
};
