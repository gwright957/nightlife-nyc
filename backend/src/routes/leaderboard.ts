import { Router, Request, Response } from "express";
import { prisma } from "../services/prisma";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { points: "desc" },
    take: 100,
    select: {
      id: true,
      username: true,
      points: true,
    },
  });

  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    ...user,
  }));

  return res.json({ leaderboard });
});

export default router;
