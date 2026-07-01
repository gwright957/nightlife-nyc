export type LineLength = "none" | "short" | "medium" | "long";
export type VenueType = "bar" | "club";
export type RewardTier = "tier_1" | "tier_2" | "tier_3";
export type RewardClaimStatus = "pending" | "contacted";

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  birthday: string;
  points: number;
  referralCode: string;
  createdAt: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: VenueType;
  distanceMeters?: number;
}

export interface NearbyVenue extends Venue {
  distanceMeters: number;
}

export interface HotVenue {
  venue: Venue;
  heatScore: number;
  avgLitScore: number;
  avgGenderRatio: number;
  ratingCount: number;
  latestVideoUrl: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  points: number;
}

export interface RewardTierProgress {
  tier: RewardTier;
  label: string;
  type: "referral" | "video";
  requiredVideos: number;
  requiredReferrals?: number;
  currentProgress: number;
  unlocked: boolean;
  claim: { id: string; status: RewardClaimStatus } | null;
}

export interface VenueTonightStats {
  avgLitScore: number;
  avgGenderRatio: number;
  dominantLineLength: LineLength;
  ratingCount: number;
}

export interface VenueVideo {
  id: string;
  videoUrl: string;
  duration: number;
  createdAt: string;
  user: { username: string };
}

export interface UserVideo {
  id: string;
  videoUrl: string;
  duration: number;
  createdAt: string;
  venue: { id: string; name: string };
}
