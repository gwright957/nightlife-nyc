import { Router, Response } from "express";
import { prisma } from "../services/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/unread-count", requireAuth, async (req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, readAt: null },
  });
  return res.json({ count });
});

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      actor: { select: { id: true, username: true, fullName: true } },
    },
  });

  return res.json({ notifications });
});

router.post("/:id/read", requireAuth, async (req: AuthRequest, res: Response) => {
  const notificationId = req.params.id;
  if (typeof notificationId !== "string") {
    return res.status(400).json({ error: "Invalid notification id" });
  }

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: req.user!.id },
  });

  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: { readAt: new Date() },
  });

  return res.json({ ok: true });
});

router.post("/read-all", requireAuth, async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });

  return res.json({ ok: true });
});

export default router;
