import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { loginRateLimit } from "../middlewares/rateLimitMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { loginSchema, refreshSchema } from "../validators/userValidator.js";

const router = Router();
router.post(
  "/login",
  loginRateLimit,
  validate(loginSchema),
  AuthController.login,
);
router.post("/refresh", validate(refreshSchema), AuthController.refresh);
router.post("/logout", validate(refreshSchema), AuthController.logout);
export default router;
