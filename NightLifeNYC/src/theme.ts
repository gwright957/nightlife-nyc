import { scale } from "./utils/scale";
import { fontStyle } from "./utils/fonts";

export const colors = {
  background: "#0A0A0A",
  surface: "#161616",
  surfaceLight: "#1E1E1E",
  surfaceMuted: "#1A1A1A",
  border: "#2A2A2A",
  borderStrong: "#333333",
  text: "#FFFFFF",
  textSecondary: "#888888",
  textMuted: "#999999",
  orange: "#FF5C00",
  /** Alias — use `orange` for new code */
  red: "#FF5C00",
  redBright: "#FF5C00",
  pink: "#FF5C00",
  coral: "#FF5C00",
  cyan: "#FF5C00",
  teal: "#FF5C00",
  gold: "#F59E0B",
  silver: "#94A3B8",
  bronze: "#D97706",
  tabInactive: "#666666",
  tabBar: "#000000",
  divider: "#1A1A1A",
  error: "#EF4444",
  destructive: "#3A1515",
  destructiveText: "#FF6B6B",
  success: "#10B981",
  white: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.72)",
};

export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(40),
  /** Consistent horizontal screen padding */
  screen: scale(20),
};

export const radii = {
  sm: scale(12),
  md: scale(14),
  lg: scale(16),
  xl: scale(20),
  full: 999,
};

export const typography = {
  pageTitle: {
    fontSize: scale(32),
    ...fontStyle("900"),
    letterSpacing: -0.8,
  },
  title: {
    fontSize: scale(28),
    ...fontStyle("800"),
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: scale(22),
    ...fontStyle("800"),
    letterSpacing: -0.3,
  },
  sectionHeader: {
    fontSize: scale(15),
    ...fontStyle("500"),
    letterSpacing: 0,
    color: colors.textSecondary,
  },
  body: { fontSize: scale(16), ...fontStyle("400") },
  caption: { fontSize: scale(13), ...fontStyle("500") },
  labelCaps: {
    fontSize: scale(11),
    ...fontStyle("700"),
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  stat: {
    fontSize: scale(28),
    ...fontStyle("900"),
    letterSpacing: -0.5,
  },
  logo: {
    fontSize: scale(44),
    ...fontStyle("900"),
    letterSpacing: -1,
  },
};

export const shadows = {
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
  },
  tabBar: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
};

/** Shared card styling for grouped content panels */
export const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radii.lg,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadows.sm,
};
