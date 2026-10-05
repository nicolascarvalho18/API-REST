import { AppError } from "../utils/AppError.js";

export const validate =
  (schema, source = "body") =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success)
      return next(
        new AppError(
          422,
          "VALIDATION_ERROR",
          "Os dados enviados são inválidos.",
          result.error.issues.map(({ path, message }) => ({
            path: path.join("."),
            message,
          })),
        ),
      );
    req[source] = result.data;
    return next();
  };
