import { Router, Response } from "express";
import { z } from "zod";
import { RewardTier } from "@prisma/client";
import { prisma } from "../services/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendRewardClaimEmail, REWARD_LABELS } from "../services/email";

const router = Router();

const TIER_THRESHOLDS: Record<RewardTier, number> = {
  tier_1: 5,
  tier_2: 7,
  tier_3: 10,
};

router.get("/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  const videoCount = await prisma.videoSubmission.count({
    where: { userId: req.user!.id },
  });

  const claims = await prisma.rewardClaim.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });

  const tiers = (Object.keys(TIER_THRESHOLDS) as RewardTier[]).map((tier) => ({
    tier,
    label: REWARD_LABELS[tier],
    requiredVideos: TIER_THRESHOLDS[tier],
    unlocked: videoCount >= TIER_THRESHOLDS[tier],
    claim: claims.find((c) => c.rewardTier === tier) ?? null,
  }));

  return res.json({ videoCount, tiers });
});

router.post("/claim", requireAuth, async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    rewardTier: z.nativeEnum(RewardTier),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const videoCount = await prisma.videoSubmission.count({
    where: { userId: req.user!.id },
  });

  const required = TIER_THRESHOLDS[parsed.data.rewardTier];
  if (videoCount < required) {
    return res.status(403).json({
      error: `Need ${required} videos to claim this reward (you have ${videoCount})`,
    });
  }

  const existing = await prisma.rewardClaim.findFirst({
    where: {
      userId: req.user!.id,
      rewardTier: parsed.data.rewardTier,
    },
  });

  if (existing) {
    return res.status(409).json({ error: "Reward already claimed", claim: existing });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    const claim = await prisma.rewardClaim.create({
      data: {
        userId: req.user!.id,
        rewardTier: parsed.data.rewardTier,
      },
    });

    await sendRewardClaimEmail({
      username: user.username,
      email: user.email,
      rewardTier: parsed.data.rewardTier,
    });

    return res.status(201).json({ claim });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to claim reward" });
  }
});

export default router;
