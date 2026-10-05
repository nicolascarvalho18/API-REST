import { AuthService } from "../services/AuthService.js";
import { publicUser } from "../models/UserModel.js";

export const AuthController = {
  async login(req, res) {
    const result = await AuthService.login(req.body.email, req.body.password);
    return res.status(200).json({
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenType: "Bearer",
        user: publicUser(result.user),
      },
    });
  },
  async refresh(req, res) {
    const result = await AuthService.refresh(req.body.refreshToken);
    return res.status(200).json({ data: { ...result, tokenType: "Bearer" } });
  },
  async logout(req, res) {
    await AuthService.logout(req.body.refreshToken);
    return res.status(204).end();
  },
};
