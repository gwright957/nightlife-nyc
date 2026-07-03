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

export type UserRelationshipStatus =
  | "none"
  | "friends"
  | "pending_sent"
  | "pending_received";

export interface UserSearchResult {
  id: string;
  username: string;
  fullName: string;
  relationshipStatus: UserRelationshipStatus;
}

export interface FriendProfile {
  id: string;
  username: string;
  fullName: string;
  points: number;
}

export interface FriendVideo {
  id: string;
  videoUrl: string;
  duration: number;
  createdAt: string;
  user: { id: string; username: string; fullName: string };
  venue: { id: string; name: string; type: VenueType };
}

export type NotificationType = "friend_request_received" | "friend_request_accepted";

export interface AppNotification {
  id: string;
  type: NotificationType;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; username: string; fullName: string } | null;
}
