import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  canonicalFriendPair,
  getFriendIds,
} from "../services/friends";
import { getTonightSince } from "../utils/tonight";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const friendIds = await getFriendIds(req.user!.id);

  if (friendIds.length === 0) {
    return res.json({ friends: [] });
  }

  const friends = await prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: {
      id: true,
      username: true,
      fullName: true,
      points: true,
    },
    orderBy: { username: "asc" },
  });

  return res.json({ friends });
});

router.post("/requests", requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({ toUserId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { toUserId } = parsed.data;
  if (toUserId === req.user!.id) {
    return res.status(400).json({ error: "You cannot add yourself" });
  }

  const target = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true },
  });
  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }

  const [userAId, userBId] = canonicalFriendPair(req.user!.id, toUserId);
  const existingFriendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (existingFriendship) {
    return res.status(409).json({ error: "You are already friends" });
  }

  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { fromUserId: req.user!.id, toUserId, status: "pending" },
        { fromUserId: toUserId, toUserId: req.user!.id, status: "pending" },
      ],
    },
  });
  if (existingRequest) {
    return res.status(409).json({ error: "Friend request already pending" });
  }

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.friendRequest.create({
      data: {
        fromUserId: req.user!.id,
        toUserId,
      },
    });

    await tx.notification.create({
      data: {
        userId: toUserId,
        type: "friend_request_received",
        actorId: req.user!.id,
        entityId: created.id,
      },
    });

    return created;
  });

  return res.status(201).json({ request });
});

router.post("/requests/:id/accept", requireAuth, async (req: AuthRequest, res: Response) => {
  const requestId = req.params.id;
  if (typeof requestId !== "string") {
    return res.status(400).json({ error: "Invalid request id" });
  }

  const friendRequest = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!friendRequest || friendRequest.toUserId !== req.user!.id) {
    return res.status(404).json({ error: "Friend request not found" });
  }

  if (friendRequest.status !== "pending") {
    return res.status(409).json({ error: "Friend request is no longer pending" });
  }

  const [userAId, userBId] = canonicalFriendPair(
    friendRequest.fromUserId,
    friendRequest.toUserId
  );

  await prisma.$transaction(async (tx) => {
    await tx.friendRequest.update({
      where: { id: friendRequest.id },
      data: { status: "accepted", respondedAt: new Date() },
    });

    await tx.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    });

    await tx.notification.updateMany({
      where: {
        userId: req.user!.id,
        entityId: friendRequest.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    await tx.notification.create({
      data: {
        userId: friendRequest.fromUserId,
        type: "friend_request_accepted",
        actorId: req.user!.id,
        entityId: friendRequest.id,
      },
    });
  });

  return res.json({ ok: true });
});

router.post("/requests/:id/decline", requireAuth, async (req: AuthRequest, res: Response) => {
  const requestId = req.params.id;
  if (typeof requestId !== "string") {
    return res.status(400).json({ error: "Invalid request id" });
  }

  const friendRequest = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!friendRequest || friendRequest.toUserId !== req.user!.id) {
    return res.status(404).json({ error: "Friend request not found" });
  }

  if (friendRequest.status !== "pending") {
    return res.status(409).json({ error: "Friend request is no longer pending" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.friendRequest.update({
      where: { id: friendRequest.id },
      data: { status: "declined", respondedAt: new Date() },
    });

    await tx.notification.updateMany({
      where: {
        userId: req.user!.id,
        entityId: friendRequest.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  });

  return res.json({ ok: true });
});

router.delete("/:userId", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId;
  if (typeof userId !== "string") {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const [userAId, userBId] = canonicalFriendPair(req.user!.id, userId);
  await prisma.friendship.deleteMany({
    where: { userAId, userBId },
  });

  return res.json({ ok: true });
});

router.get("/feed", requireAuth, async (req: AuthRequest, res: Response) => {
  const friendIds = await getFriendIds(req.user!.id);
  if (friendIds.length === 0) {
    return res.json({ videos: [] });
  }

  const since = getTonightSince();
  const videos = await prisma.videoSubmission.findMany({
    where: {
      userId: { in: friendIds },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, fullName: true } },
      venue: { select: { id: true, name: true, type: true } },
    },
  });

  return res.json({ videos });
});

export default router;
