import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getRelationshipStatus } from "../services/friends";

const router = Router();

router.get("/search", requireAuth, async (req: AuthRequest, res: Response) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 1) {
    return res.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.user!.id },
      username: { contains: q, mode: "insensitive" },
    },
    select: {
      id: true,
      username: true,
      fullName: true,
    },
    orderBy: { username: "asc" },
    take: 20,
  });

  const results = await Promise.all(
    users.map(async (user) => ({
      ...user,
      relationshipStatus: await getRelationshipStatus(req.user!.id, user.id),
    }))
  );

  return res.json({ users: results });
});

export default router;
