import { RewardTier, RewardTierProgress } from "../types";

export const CHALLENGE_COUNT = 10;

export type ChallengeDisplay = {
  number: number;
  reward: string;
  requirement: string;
  progressLabel: string;
  isLockedPreview: boolean;
  isClaimed: boolean;
  isReady: boolean;
  tier?: RewardTier;
};

const PLACEHOLDER_CHALLENGES = [
  { reward: "vip entry", requirement: "complete previous challenge" },
  { reward: "skip the line", requirement: "complete previous challenge" },
  { reward: "table credit", requirement: "complete previous challenge" },
  { reward: "guest list", requirement: "complete previous challenge" },
  { reward: "bottle service", requirement: "complete previous challenge" },
  { reward: "afterparty pass", requirement: "complete previous challenge" },
  { reward: "night legend", requirement: "complete previous challenge" },
];

function tierProgressLabel(tier: RewardTierProgress): string {
  if (tier.type === "referral") {
    const required = tier.requiredReferrals ?? 3;
    const current = Math.min(tier.currentProgress, required);
    return `${current} of ${required} friends referred`;
  }
  const current = Math.min(tier.currentProgress, tier.requiredVideos);
  return `${current} of ${tier.requiredVideos} videos`;
}

function firstIncompleteIndex(tiers: RewardTierProgress[]): number {
  for (let i = 0; i < 3; i++) {
    const tier = tiers[i];
    if (!tier || !tier.claim) {
      return i;
    }
  }

  if (!tiers[2]?.claim) {
    return 2;
  }

  return CHALLENGE_COUNT;
}

export function buildChallenges(tiers: RewardTierProgress[]): ChallengeDisplay[] {
  const lockedFromIndex = firstIncompleteIndex(tiers);

  const coreDefinitions = [
    { reward: "1 free drink", requirement: "invite three friends" },
    { reward: "2 free drinks", requirement: "submit seven videos" },
    { reward: "3 free drinks", requirement: "submit ten videos" },
  ];

  return Array.from({ length: CHALLENGE_COUNT }, (_, index) => {
    const number = index + 1;
    const isLockedPreview = index > lockedFromIndex;

    if (isLockedPreview) {
      return {
        number,
        reward: "",
        requirement: "",
        progressLabel: "",
        isLockedPreview: true,
        isClaimed: false,
        isReady: false,
      };
    }

    const tier = tiers[index];
    if (tier) {
      const [requirement, reward] = tier.label.split(" — ");
      return {
        number,
        reward: reward ?? coreDefinitions[index]?.reward ?? tier.label,
        requirement:
          tier.type === "referral"
            ? "invite three friends"
            : requirement ?? coreDefinitions[index]?.requirement ?? "",
        progressLabel: tierProgressLabel(tier),
        isLockedPreview: false,
        isClaimed: !!tier.claim,
        isReady: tier.unlocked && !tier.claim,
        tier: tier.tier,
      };
    }

    const placeholder = PLACEHOLDER_CHALLENGES[index - 3];
    return {
      number,
      reward: placeholder?.reward ?? `reward ${number}`,
      requirement: placeholder?.requirement ?? "complete previous challenge",
      progressLabel: "locked",
      isLockedPreview: false,
      isClaimed: false,
      isReady: false,
    };
  });
}
