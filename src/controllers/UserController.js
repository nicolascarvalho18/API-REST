import { UserService } from "../services/UserService.js";
import { publicUser } from "../models/UserModel.js";

export const UserController = {
  async create(req, res) {
    const user = await UserService.create(req.body);
    return res.status(201).json({ data: publicUser(user) });
  },
  async get(req, res) {
    const user = await UserService.get(req.params.id, req.user);
    return res.status(200).json({ data: publicUser(user) });
  },
  async update(req, res) {
    const user = await UserService.update(req.params.id, req.body, req.user);
    return res.status(200).json({ data: publicUser(user) });
  },
  async delete(req, res) {
    await UserService.delete(req.params.id, req.user);
    return res.status(204).end();
  },
};
