import { z } from "zod";

const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const name = z.string().trim().min(3).max(100);
const password = z.string().min(12).max(128);
const strict = { error: "Campos não permitidos." };

export const createUserSchema = z
  .object({ name, email, password })
  .strict(strict);
export const updateUserSchema = z
  .object({ name, email })
  .strict(strict)
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });
export const idSchema = z.object({ id: z.string().uuid() });
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict(strict);
export const refreshSchema = z
  .object({ refreshToken: z.string().min(40).max(200) })
  .strict(strict);
