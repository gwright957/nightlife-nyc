import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  buildReferralShareMessage,
  countVerifiedReferrals,
  ensureUserReferralCode,
  REFERRALS_REQUIRED_FOR_TIER_1,
} from "../services/referrals";

const router = Router();

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const referralCode = await ensureUserReferralCode(req.user!.id);
  const friendsReferred = await countVerifiedReferrals(req.user!.id);

  return res.json({
    referralCode,
    friendsReferred,
    friendsRequired: REFERRALS_REQUIRED_FOR_TIER_1,
    shareMessage: buildReferralShareMessage(referralCode),
  });
});

export default router;
