import { prisma } from "../config/database.js";

export const UserRepository = {
  findById: (id) => prisma.user.findUnique({ where: { id } }),
  findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  create: (data) => prisma.user.create({ data }),
  update: (id, data) => prisma.user.update({ where: { id }, data }),
  delete: (id) => prisma.user.delete({ where: { id } }),
  createSession: (data) => prisma.refreshSession.create({ data }),
  findSession: (tokenHash) =>
    prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    }),
  revokeSession: (id, revokedAt = new Date()) =>
    prisma.refreshSession.update({ where: { id }, data: { revokedAt } }),
  revokeActiveSessionsForUser: (userId) =>
    prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  rotateSession: (id, oldTokenHash, newSession) =>
    prisma.$transaction(async (tx) => {
      const changed = await tx.refreshSession.updateMany({
        where: {
          id,
          tokenHash: oldTokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      });
      if (changed.count !== 1) return null;
      return tx.refreshSession.create({ data: newSession });
    }),
};
