import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const notFoundMiddleware = (req, _res, next) =>
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Rota ${req.method} ${req.path} não encontrada.`,
    ),
  );
export const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  let normalized = error;
  if (error instanceof SyntaxError && error.status === 400 && "body" in error)
    normalized = new AppError(
      400,
      "MALFORMED_JSON",
      "O corpo JSON da requisição está malformado.",
    );
  if (error instanceof ZodError)
    normalized = new AppError(
      422,
      "VALIDATION_ERROR",
      "Os dados enviados são inválidos.",
      error.issues.map(({ path, message }) => ({
        path: path.join("."),
        message,
      })),
    );
  if (error.code === "P2002")
    normalized = new AppError(
      409,
      "CONFLICT",
      "Já existe um registro com esses dados.",
    );
  if (["P2003", "P2014"].includes(error.code))
    normalized = new AppError(
      409,
      "DATA_INTEGRITY_CONFLICT",
      "A operação viola uma relação de integridade dos dados.",
    );
  if (error.type === "entity.too.large")
    normalized = new AppError(
      413,
      "BODY_TOO_LARGE",
      "O corpo da requisição excede o limite permitido.",
    );
  if (!(normalized instanceof AppError)) {
    logger.error("Unhandled request error", {
      method: req.method,
      path: req.path,
      name: error.name,
    });
    normalized = new AppError(
      500,
      "INTERNAL_ERROR",
      "Erro interno do servidor.",
    );
  }
  if (normalized.status >= 500)
    logger.error("Request failed", {
      method: req.method,
      path: req.path,
      code: normalized.code,
    });
  res.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
  });
};
