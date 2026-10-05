import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export const authenticate = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return next(
      new AppError(401, "AUTHENTICATION_REQUIRED", "Autenticação necessária."),
    );
  try {
    const claims = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });
    if (typeof claims !== "object" || !claims.sub)
      throw new Error("Invalid subject");
    req.user = { id: claims.sub, email: claims.email };
    return next();
  } catch {
    return next(
      new AppError(
        401,
        "INVALID_TOKEN",
        "Token de acesso inválido ou expirado.",
      ),
    );
  }
};
