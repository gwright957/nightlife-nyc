import { Venue, NearbyVenue } from "../types";

export type AuthStackParamList = {
  Email: undefined;
  Otp: { email: string };
  ReferralCode: { email: string };
  ProfileSetup: { email: string; referralCode?: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Submit: undefined;
  Rewards: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Leaderboard: undefined;
  Rating: { venue: NearbyVenue | Venue };
  VenueDetail: { venueId: string };
  Inbox: undefined;
  Friends: undefined;
};
