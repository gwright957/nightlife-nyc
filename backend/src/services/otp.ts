import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { sendOtpEmail } from "./email";

const OTP_EXPIRY_MINUTES = 10;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_SENDS_PER_WINDOW = 3;

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function checkSendRateLimit(email: string): Promise<void> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const recentCount = await prisma.otpCode.count({
    where: {
      email,
      createdAt: { gte: since },
    },
  });

  if (recentCount >= MAX_SENDS_PER_WINDOW) {
    throw new Error(
      `Too many code requests. Try again in ${RATE_LIMIT_WINDOW_MINUTES} minutes.`
    );
  }
}

export async function createAndSendOtp(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  await checkSendRateLimit(normalized);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      email: normalized,
      code,
      expiresAt,
    },
  });

  await sendOtpEmail({ email: normalized, code });
}

export async function verifyOtpCode(
  email: string,
  code: string
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const now = new Date();

  const otp = await prisma.otpCode.findFirst({
    where: {
      email: normalized,
      used: false,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.code !== code) {
    return false;
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { used: true },
  });

  return true;
}
