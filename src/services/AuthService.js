import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "node:crypto";
import { env } from "../config/env.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { AppError } from "../utils/AppError.js";

const digest = (token) => createHash("sha256").update(token).digest("hex");
const signAccess = (user) =>
  jwt.sign({ email: user.email }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL,
    algorithm: "HS256",
  });
const newRefresh = () => randomBytes(48).toString("base64url");
const sessionExpiry = () =>
  new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000);
const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos.");
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$RfbKJmlSXFJdh8Z4kUXr0Q$r8+0dPUC+2NwcebIX92sEsi4x/ouNoB/uoq+dI2ik9o";

export const AuthService = {
  async login(email, password) {
    const user = await UserRepository.findByEmail(email);
    const passwordMatches = await argon2.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      password,
    );
    if (!user || !passwordMatches) throw invalidCredentials();
    const refreshToken = newRefresh();
    await UserRepository.createSession({
      tokenHash: digest(refreshToken),
      userId: user.id,
      expiresAt: sessionExpiry(),
    });
    return { accessToken: signAccess(user), refreshToken, user };
  },
  async refresh(token) {
    const session = await UserRepository.findSession(digest(token));
    if (!session)
      throw new AppError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token inválido ou expirado.",
      );
    if (session.revokedAt) {
      await UserRepository.revokeActiveSessionsForUser(session.userId);
      throw new AppError(
        401,
        "REFRESH_TOKEN_REUSE",
        "Reutilização de refresh token detectada; sessões ativas revogadas.",
      );
    }
    if (session.expiresAt <= new Date())
      throw new AppError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token inválido ou expirado.",
      );
    const refreshToken = newRefresh();
    const rotated = await UserRepository.rotateSession(
      session.id,
      digest(token),
      {
        tokenHash: digest(refreshToken),
        userId: session.userId,
        expiresAt: sessionExpiry(),
      },
    );
    if (!rotated) {
      await UserRepository.revokeActiveSessionsForUser(session.userId);
      throw new AppError(
        401,
        "REFRESH_TOKEN_REUSE",
        "Reutilização concorrente de refresh token detectada; sessões ativas revogadas.",
      );
    }
    return { accessToken: signAccess(session.user), refreshToken };
  },
  async logout(token) {
    const session = await UserRepository.findSession(digest(token));
    if (session && !session.revokedAt)
      await UserRepository.revokeSession(session.id);
  },
};
