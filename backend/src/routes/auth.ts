import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../services/prisma";
import {
  createAndSendOtp,
  hasRecentVerifiedOtp,
  normalizeEmail,
  verifyOtpCode,
} from "../services/otp";
import { OtpEmailError } from "../services/email";
import {
  generateUniqueReferralCode,
  normalizeReferralCode,
  resolveReferrer,
  ensureUserReferralCode,
} from "../services/referrals";
import { signToken, requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const emailSchema = z.string().email().transform(normalizeEmail);
const referralCodeSchema = z
  .string()
  .trim()
  .min(4)
  .max(12)
  .regex(/^[a-zA-Z0-9]+$/)
  .transform(normalizeReferralCode)
  .optional();

router.post("/send-otp", async (req: Request, res: Response) => {
  const schema = z.object({ email: emailSchema });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    await createAndSendOtp(parsed.data.email);
    return res.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Too many code requests")) {
      return res.status(429).json({ error: error.message });
    }
    if (error instanceof OtpEmailError) {
      console.error("[send-otp] Email delivery failed:", error.message);
      if (error.causeDetail) {
        console.error("[send-otp] Resend error detail:", error.causeDetail);
      }
      return res.status(502).json({ error: error.message });
    }
    console.error("[send-otp] Unexpected error:", error);
    return res.status(500).json({ error: "Failed to send verification code" });
  }
});

router.post("/verify-otp", async (req: Request, res: Response) => {
  const schema = z.object({
    email: emailSchema,
    code: z.string().length(6),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const valid = await verifyOtpCode(parsed.data.email, parsed.data.code);
    if (!valid) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      const token = signToken(existing.id);
      return res.json({ token, user: existing, isNewUser: false });
    }

    return res.json({
      token: null,
      user: null,
      isNewUser: true,
      email: parsed.data.email,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to verify code" });
  }
});

router.post("/register", async (req: Request, res: Response) => {
  const schema = z.object({
    email: emailSchema,
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
    fullName: z.string().min(1).max(100),
    birthday: z.string().datetime({ offset: true }).or(z.string().date()),
    referralCode: referralCodeSchema,
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const emailVerified = await hasRecentVerifiedOtp(parsed.data.email);
    if (!emailVerified) {
      return res.status(403).json({
        error: "Verify your email with the code we sent before creating your account",
      });
    }

    let referrer: { id: string; email: string } | null = null;
    if (parsed.data.referralCode) {
      referrer = await resolveReferrer(parsed.data.referralCode);
      if (!referrer) {
        return res.status(400).json({ error: "Invalid referral code" });
      }
      if (referrer.email === parsed.data.email) {
        return res.status(400).json({ error: "You cannot use your own referral code" });
      }
    }

    const referralCode = await generateUniqueReferralCode();

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: parsed.data.email,
          username: parsed.data.username,
          fullName: parsed.data.fullName,
          birthday: new Date(parsed.data.birthday),
          referralCode,
          referredById: referrer?.id ?? null,
        },
      });

      if (referrer) {
        await tx.referral.create({
          data: {
            referrerId: referrer.id,
            referredUserId: created.id,
            referredEmail: created.email,
          },
        });
      }

      return created;
    });

    const token = signToken(user.id);
    return res.status(201).json({ token, user });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ error: "Email, username, or referral already used" });
    }
    console.error(error);
    return res.status(500).json({ error: "Failed to register user" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  await ensureUserReferralCode(req.user!.id);
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ user });
});

async function ensureReferralCode(userId: string) {
  await ensureUserReferralCode(userId);
}

router.post("/demo", async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_AUTH_ENABLED !== "true") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: "demo@nightlife.local" },
      create: {
        email: "demo@nightlife.local",
        username: "demouser",
        fullName: "Demo User",
        birthday: new Date("2000-06-15T12:00:00.000Z"),
        points: 50,
        referralCode: await generateUniqueReferralCode(),
      },
      update: {},
    });

    await ensureReferralCode(user.id);
    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const token = signToken(refreshed.id);
    console.log("[auth] Demo login:", refreshed.username);
    return res.json({ token, user: refreshed });
  } catch (error) {
    console.error("[auth] Demo login failed:", error);
    return res.status(500).json({ error: "Demo login failed" });
  }
});

const DEV_TEST_EMAIL = "test@gmail.com";
const DEV_TEST_PASSWORD = "test123";

router.post("/dev-login", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_AUTH_ENABLED !== "true") {
    return res.status(404).json({ error: "Not found" });
  }

  const schema = z.object({
    email: emailSchema,
    password: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (
    parsed.data.email !== DEV_TEST_EMAIL ||
    parsed.data.password !== DEV_TEST_PASSWORD
  ) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: DEV_TEST_EMAIL },
      create: {
        email: DEV_TEST_EMAIL,
        username: "testuser",
        fullName: "Test User",
        birthday: new Date("2000-01-01T12:00:00.000Z"),
        points: 0,
        referralCode: await generateUniqueReferralCode(),
      },
      update: {},
    });

    await ensureReferralCode(user.id);
    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const token = signToken(refreshed.id);
    console.log("[auth] Dev login:", refreshed.email);
    return res.json({ token, user: refreshed });
  } catch (error) {
    console.error("[auth] Dev login failed:", error);
    return res.status(500).json({ error: "Login failed" });
  }
});

export default router;
