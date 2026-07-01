import { Router, Response } from "express";
import { z } from "zod";
import { RewardTier } from "@prisma/client";
import { prisma } from "../services/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { sendRewardClaimEmail, REWARD_LABELS } from "../services/email";
import {
  buildReferralShareMessage,
  countVerifiedReferrals,
  ensureUserReferralCode,
  REFERRALS_REQUIRED_FOR_TIER_1,
} from "../services/referrals";

const router = Router();

const VIDEO_TIER_THRESHOLDS: Record<Exclude<RewardTier, "tier_1">, number> = {
  tier_2: 7,
  tier_3: 10,
};

function isTierUnlocked(
  tier: RewardTier,
  videoCount: number,
  referralCount: number
): boolean {
  if (tier === "tier_1") {
    return referralCount >= REFERRALS_REQUIRED_FOR_TIER_1;
  }

  if (referralCount < REFERRALS_REQUIRED_FOR_TIER_1) {
    return false;
  }

  if (tier === "tier_2") {
    return videoCount >= VIDEO_TIER_THRESHOLDS.tier_2;
  }

  return (
    videoCount >= VIDEO_TIER_THRESHOLDS.tier_2 &&
    videoCount >= VIDEO_TIER_THRESHOLDS.tier_3
  );
}

router.get("/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  const referralCode = await ensureUserReferralCode(req.user!.id);

  const videoCount = await prisma.videoSubmission.count({
    where: { userId: req.user!.id },
  });

  const friendsReferred = await countVerifiedReferrals(req.user!.id);

  const claims = await prisma.rewardClaim.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });

  const tierConfigs = [
    {
      tier: "tier_1" as const,
      label: REWARD_LABELS.tier_1,
      type: "referral" as const,
      requiredReferrals: REFERRALS_REQUIRED_FOR_TIER_1,
      requiredVideos: 0,
      currentProgress: friendsReferred,
    },
    {
      tier: "tier_2" as const,
      label: REWARD_LABELS.tier_2,
      type: "video" as const,
      requiredReferrals: 0,
      requiredVideos: VIDEO_TIER_THRESHOLDS.tier_2,
      currentProgress: videoCount,
    },
    {
      tier: "tier_3" as const,
      label: REWARD_LABELS.tier_3,
      type: "video" as const,
      requiredReferrals: 0,
      requiredVideos: VIDEO_TIER_THRESHOLDS.tier_3,
      currentProgress: videoCount,
    },
  ];

  const tiers = tierConfigs.map((config) => ({
    ...config,
    unlocked: isTierUnlocked(config.tier, videoCount, friendsReferred),
    claim: claims.find((c) => c.rewardTier === config.tier) ?? null,
  }));

  const tier1Complete = friendsReferred >= REFERRALS_REQUIRED_FOR_TIER_1;

  return res.json({
    videoCount,
    friendsReferred,
    friendsRequired: REFERRALS_REQUIRED_FOR_TIER_1,
    referralCode,
    shareMessage: buildReferralShareMessage(referralCode),
    referralPhaseComplete: tier1Complete,
    tiers,
  });
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

  const friendsReferred = await countVerifiedReferrals(req.user!.id);

  if (!isTierUnlocked(parsed.data.rewardTier, videoCount, friendsReferred)) {
    if (parsed.data.rewardTier === "tier_1") {
      return res.status(403).json({
        error: `Need ${REFERRALS_REQUIRED_FOR_TIER_1} friends to sign up with your code (you have ${friendsReferred})`,
      });
    }

    const required = VIDEO_TIER_THRESHOLDS[parsed.data.rewardTier];
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
