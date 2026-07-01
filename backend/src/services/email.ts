import { Resend } from "resend";
import { RewardTier } from "@prisma/client";

const REWARD_LABELS: Record<RewardTier, string> = {
  tier_1: "Invite 3 friends — 1 free drink",
  tier_2: "7 videos — 2 free drinks",
  tier_3: "10 videos — 3 free drinks",
};

export class OtpEmailError extends Error {
  readonly causeDetail?: unknown;

  constructor(message: string, causeDetail?: unknown) {
    super(message);
    this.name = "OtpEmailError";
    this.causeDetail = causeDetail;
  }
}

function getResendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() ?? "NightLife NYC <onboarding@resend.dev>";
}

function getResendClient(): Resend {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new OtpEmailError(
      "Email is not configured on the server (RESEND_API_KEY missing in backend/.env)."
    );
  }
  return new Resend(apiKey);
}

function formatResendError(message: string, to: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("only send") ||
    lower.includes("testing emails") ||
    lower.includes("verify a domain")
  ) {
    return `Could not send code to ${to}. ${message} With the Resend sandbox sender (onboarding@resend.dev), you can only deliver to the email address on your Resend account.`;
  }
  return `Could not send verification email to ${to}: ${message}`;
}

export async function sendOtpEmail(params: { email: string; code: string }) {
  const fromAddress = getFromAddress();
  const resend = getResendClient();

  const subject = "Your NightLife NYC code";
  const text = `Your NightLife NYC verification code is: ${params.code}\n\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0A0A0F; color:#fff; padding:32px; border-radius:16px; max-width:480px;">
      <h1 style="color:#EC4899; margin:0 0 8px;">NightLife NYC</h1>
      <p style="color:#9CA3AF; margin:0 0 24px;">Your verification code</p>
      <div style="background:#14141F; border:1px solid #A855F7; border-radius:12px; padding:24px; text-align:center; letter-spacing:8px; font-size:32px; font-weight:800; color:#fff;">
        ${params.code}
      </div>
      <p style="color:#9CA3AF; margin:24px 0 0; font-size:14px;">Expires in 10 minutes.</p>
    </div>
  `.trim();

  console.log(
    `[send-otp] Sending OTP email to ${params.email} via Resend (from: ${fromAddress})`
  );

  const result = await resend.emails.send({
    from: fromAddress,
    to: params.email,
    subject,
    text,
    html,
  });

  if (result.error) {
    const readable = formatResendError(result.error.message, params.email);
    console.error("[send-otp] Resend API error:", JSON.stringify(result.error, null, 2));
    console.error(`[send-otp] Failed to deliver OTP to ${params.email}: ${readable}`);
    throw new OtpEmailError(readable, result.error);
  }

  console.log(
    `[send-otp] Resend success — OTP email sent to ${params.email} (message id: ${result.data.id})`
  );

  return result.data;
}

export async function sendRewardClaimEmail(params: {
  username: string;
  email: string;
  rewardTier: RewardTier;
}) {
  const to = process.env.REWARD_CLAIM_EMAIL ?? "gavinwright957@gmail.com";
  const apiKey = getResendApiKey();
  const fromAddress = getFromAddress();

  const subject = `Reward claim: ${params.username}`;
  const body = `
A user has claimed a reward on NightLife NYC.

Username: ${params.username}
Email: ${params.email}
Reward: ${REWARD_LABELS[params.rewardTier]}

Please follow up with the user to fulfill this reward.
  `.trim();

  if (!apiKey) {
    console.log("[email stub]", { to, subject, body });
    return { id: "stub" };
  }

  const resend = new Resend(apiKey);
  return resend.emails.send({ from: fromAddress, to, subject, text: body });
}

export { REWARD_LABELS };
