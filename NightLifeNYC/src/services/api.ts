import Config from 'react-native-config';
import type {
  User,
  Venue,
  NearbyVenue,
  HotVenue,
  LeaderboardEntry,
  RewardTierProgress,
  VenueTonightStats,
  VenueVideo,
  UserVideo,
  LineLength,
  RewardTier,
} from '../types';
import { ApiError } from '../utils/apiErrors';

export const PRODUCTION_API_URL = 'https://nightlife-nyc-api.onrender.com';

const API_URL = Config.API_URL || PRODUCTION_API_URL;

const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 2_000;
const MAX_ATTEMPTS = 2;

let authToken: string | null = null;
type RequestStatus = 'idle' | 'retrying';
type RequestStatusListener = (status: RequestStatus) => void;
let requestStatusListener: RequestStatusListener | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setRequestStatusListener(listener: RequestStatusListener | null) {
  requestStatusListener = listener;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {...options, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof ApiError && error.kind === 'network') return true;
  if (!(error instanceof Error)) return true;
  const msg = error.message.toLowerCase();
  return (
    error.name === 'AbortError' ||
    msg.includes('aborted') ||
    msg.includes('network request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('could not connect') ||
    msg.includes('failed to fetch') ||
    msg.includes('timed out')
  );
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const url = `${API_URL}${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      requestStatusListener?.('retrying');
      await sleep(RETRY_DELAY_MS);
    }

    try {
      const response = await fetchWithTimeout(
        url,
        {...options, headers},
        REQUEST_TIMEOUT_MS,
      );

      requestStatusListener?.('idle');

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ?? `Request failed (${response.status})`;
        throw new ApiError(
          message,
          response.status >= 500 ? 'server' : 'client',
        );
      }

      return data as T;
    } catch (error) {
      lastError = error;

      if (
        error instanceof ApiError &&
        error.kind !== 'network' &&
        error.kind !== 'server'
      ) {
        requestStatusListener?.('idle');
        throw error;
      }

      const canRetry =
        attempt < MAX_ATTEMPTS - 1 && isRetryableNetworkError(error);
      if (!canRetry) {
        requestStatusListener?.('idle');
        break;
      }
    }
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(
    'The app could not connect to the backend. Check your internet connection and try again.',
    'network',
  );
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/health`,
      {},
      REQUEST_TIMEOUT_MS,
    );
    return response.ok;
  } catch {
    return false;
  }
}

export const api = {
  sendOtp: (email: string) =>
    request<{ ok: boolean }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  verifyOtp: (email: string, code: string) =>
    request<{
      token: string | null;
      user: User | null;
      isNewUser: boolean;
      email?: string;
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  register: (payload: {
    email: string;
    username: string;
    fullName: string;
    birthday: string;
    referralCode?: string;
  }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => request<{ user: User }>('/api/auth/me'),

  demoLogin: () =>
    request<{ token: string; user: User }>('/api/auth/demo', {
      method: 'POST',
    }),

  devLogin: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getNearbyVenues: (lat: number, lng: number, radiusMeters?: number) => {
    const radiusQuery =
      radiusMeters !== undefined ? `&radiusMeters=${radiusMeters}` : '';
    return request<{ venues: NearbyVenue[] }>(
      `/api/venues/nearby?lat=${lat}&lng=${lng}${radiusQuery}`,
    );
  },

  getHottestVenues: () => request<{ venues: HotVenue[] }>('/api/venues/hottest'),

  searchVenues: (q: string) =>
    request<{ venues: Venue[] }>(`/api/venues/search?q=${encodeURIComponent(q)}`),

  getVenueTonight: (id: string) =>
    request<{
      venue: Venue;
      stats: VenueTonightStats;
      videos: VenueVideo[];
    }>(`/api/venues/${id}/tonight`),

  submitRating: (payload: {
    venueId: string;
    litScore: number;
    genderRatio: number;
    lineLength: LineLength;
    lat: number;
    lng: number;
  }) =>
    request<{ rating: unknown; user: User }>('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getVideoUploadUrl: (venueId: string, lat: number, lng: number) =>
    request<{ uploadUrl: string; videoUrl: string; key: string }>(
      '/api/videos/upload-url',
      {
        method: 'POST',
        body: JSON.stringify({ venueId, lat, lng }),
      },
    ),

  submitVideo: (payload: {
    venueId: string;
    videoUrl: string;
    duration: number;
    lat: number;
    lng: number;
  }) =>
    request<{ video: unknown; user: User }>('/api/videos', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getLeaderboard: () =>
    request<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard'),

  getMyVideos: () =>
    request<{ videos: UserVideo[] }>('/api/videos/me'),

  getRewardProgress: () =>
    request<{
      videoCount: number;
      friendsReferred: number;
      friendsRequired: number;
      referralCode: string;
      shareMessage: string;
      referralPhaseComplete: boolean;
      tiers: RewardTierProgress[];
    }>('/api/rewards/progress'),

  getReferrals: () =>
    request<{
      referralCode: string;
      friendsReferred: number;
      friendsRequired: number;
      shareMessage: string;
    }>('/api/referrals/me'),

  claimReward: (rewardTier: RewardTier) =>
    request<{ claim: { id: string; status: string } }>('/api/rewards/claim', {
      method: 'POST',
      body: JSON.stringify({ rewardTier }),
    }),
};

export { API_URL };

/** 500 feet — must match backend RATING_SUBMIT_RADIUS_METERS */
export const RATING_SUBMIT_RADIUS_METERS = 500 * 0.3048;
