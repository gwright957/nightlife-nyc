import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { normalizeEmail } from "./otp";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERRALS_REQUIRED_FOR_TIER_1 = 3;

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = randomBytes(6);
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
    }

    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!existing) {
      return code;
    }
  }

  throw new Error("Failed to generate referral code");
}

export async function countVerifiedReferrals(referrerId: string): Promise<number> {
  return prisma.referral.count({
    where: { referrerId },
  });
}

export async function resolveReferrer(referralCode: string) {
  const normalized = normalizeReferralCode(referralCode);
  if (!normalized) {
    return null;
  }

  return prisma.user.findUnique({
    where: { referralCode: normalized },
    select: { id: true, email: true },
  });
}

export function buildReferralShareMessage(referralCode: string): string {
  return (
    `hey — i've been using afterdark to see what's actually popping tonight in nyc. ` +
    `download the app and use my code ${referralCode} when you sign up. would love to have you in.`
  );
}

export async function ensureUserReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (user?.referralCode) {
    return user.referralCode;
  }

  const referralCode = await generateUniqueReferralCode();
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode },
  });
  return referralCode;
}
