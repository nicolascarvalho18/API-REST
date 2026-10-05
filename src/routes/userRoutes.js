import { Router } from "express";
import { UserController } from "../controllers/UserController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  createUserSchema,
  idSchema,
  updateUserSchema,
} from "../validators/userValidator.js";

const router = Router();
router.post("/", validate(createUserSchema), UserController.create);
router.get(
  "/:id",
  authenticate,
  validate(idSchema, "params"),
  UserController.get,
);
router.put(
  "/:id",
  authenticate,
  validate(idSchema, "params"),
  validate(updateUserSchema),
  UserController.update,
);
router.delete(
  "/:id",
  authenticate,
  validate(idSchema, "params"),
  UserController.delete,
);
export default router;
