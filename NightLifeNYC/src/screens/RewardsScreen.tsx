import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { colors, radii, spacing, typography, cardStyle } from "../theme";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { ScreenLabel } from "../components/ScreenLabel";
import { api } from "../services/api";
import { getApiErrorAlert } from "../utils/apiErrors";
import { useAuthStore } from "../store/authStore";
import { scale } from "../utils/scale";
import { LeaderboardEntry, RewardTierProgress } from "../types";
import { buildReferralShareMessage } from "../utils/referralShare";

type Section = "rewards" | "rankings";

function tierStatus(tier: RewardTierProgress): "locked" | "ready" | "claimed" {
  if (tier.claim) return "claimed";
  if (tier.unlocked) return "ready";
  return "locked";
}

function rankStyle(rank: number) {
  if (rank <= 3) {
    return { color: colors.orange, fontWeight: "800" as const };
  }
  return { color: colors.text, fontWeight: "700" as const };
}

function tierProgressLabel(tier: RewardTierProgress): string {
  if (tier.type === "referral") {
    const required = tier.requiredReferrals ?? 3;
    const current = Math.min(tier.currentProgress, required);
    return `${current} of ${required} friends referred`;
  }
  const current = Math.min(tier.currentProgress, tier.requiredVideos);
  return `${current} of ${tier.requiredVideos} videos`;
}

function SectionToggle({
  active,
  onChange,
}: {
  active: Section;
  onChange: (section: Section) => void;
}) {
  return (
    <View style={styles.toggleWrap}>
      <TouchableOpacity onPress={() => onChange("rewards")} hitSlop={8}>
        <Text style={[styles.toggleLabel, active === "rewards" && styles.toggleActive]}>
          Rewards
        </Text>
      </TouchableOpacity>
      <View style={styles.toggleDivider} />
      <TouchableOpacity onPress={() => onChange("rankings")} hitSlop={8}>
        <Text style={[styles.toggleLabel, active === "rankings" && styles.toggleActive]}>
          Rankings
        </Text>
      </TouchableOpacity>
    </View>
  );
}

async function shareViaIMessage(message: string) {
  const encoded = encodeURIComponent(message);
  const url = Platform.OS === "ios" ? `sms:&body=${encoded}` : `sms:?body=${encoded}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Unable to open Messages");
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Unable to open Messages");
  }
}

export function RewardsScreen() {
  const user = useAuthStore((s) => s.user);
  const [section, setSection] = useState<Section>("rewards");
  const [videoCount, setVideoCount] = useState(0);
  const [friendsReferred, setFriendsReferred] = useState(0);
  const [friendsRequired, setFriendsRequired] = useState(3);
  const [referralCode, setReferralCode] = useState(user?.referralCode ?? "");
  const [shareMessage, setShareMessage] = useState(
    user?.referralCode ? buildReferralShareMessage(user.referralCode) : "",
  );
  const [referralPhaseComplete, setReferralPhaseComplete] = useState(false);
  const [tiers, setTiers] = useState<RewardTierProgress[]>([]);
  const [topFive, setTopFive] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [rewardIndex, setRewardIndex] = useState(0);

  const load = async () => {
    try {
      await useAuthStore.getState().refreshUser();
      const currentUser = useAuthStore.getState().user;

      const [rewardData, leaderboardData] = await Promise.all([
        api.getRewardProgress(),
        api.getLeaderboard(),
      ]);

      const code =
        rewardData.referralCode ||
        currentUser?.referralCode ||
        user?.referralCode ||
        "";

      setVideoCount(rewardData.videoCount);
      setFriendsReferred(rewardData.friendsReferred);
      setFriendsRequired(rewardData.friendsRequired);
      setReferralCode(code);
      setReferralPhaseComplete(rewardData.referralPhaseComplete);
      setTiers(rewardData.tiers);
      setShareMessage(
        rewardData.shareMessage || (code ? buildReferralShareMessage(code) : ""),
      );
      setTopFive(leaderboardData.leaderboard.slice(0, 5));
      const mine = leaderboardData.leaderboard.find((entry) => entry.id === user?.id);
      setMyRank(mine?.rank ?? null);
    } catch {
      const fallbackCode = user?.referralCode || useAuthStore.getState().user?.referralCode || "";
      if (fallbackCode) {
        setReferralCode(fallbackCode);
        setShareMessage(buildReferralShareMessage(fallbackCode));
      }
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [user?.id]));

  const inReferralPhase = !referralPhaseComplete;
  const nextTier = tiers.find((t) => !t.unlocked && !t.claim);
  const nextTierIndex = tiers.findIndex((t) => !t.unlocked && !t.claim);
  const currentTier = tiers[rewardIndex];
  const isHiddenReward =
    nextTierIndex !== -1 && rewardIndex > nextTierIndex;

  const heroLabel = inReferralPhase ? "Friends referred" : "Videos submitted";
  const heroValue = inReferralPhase ? friendsReferred : videoCount;
  const heroRequired = inReferralPhase
    ? friendsRequired
    : nextTier?.requiredVideos ?? tiers[tiers.length - 1]?.requiredVideos ?? 10;
  const heroProgress = Math.min(heroValue / Math.max(heroRequired, 1), 1);

  const heroMeta = (() => {
    if (inReferralPhase) {
      const remaining = Math.max(friendsRequired - friendsReferred, 0);
      return remaining > 0
        ? `${remaining} more friend${remaining === 1 ? "" : "s"} to unlock 1 free drink`
        : "Claim your free drink reward";
    }
    if (!nextTier || nextTier.type === "referral") {
      return "All rewards unlocked";
    }
    const remaining = Math.max(nextTier.requiredVideos - videoCount, 0);
    const reward = nextTier.label.split(" — ")[1] ?? "next reward";
    return remaining > 0
      ? `${remaining} more videos to unlock ${reward}`
      : "All rewards unlocked";
  })();

  const handleClaim = async (tier: RewardTierProgress) => {
    setClaiming(tier.tier);
    try {
      await api.claimReward(tier.tier);
      Alert.alert("Claimed", "We will reach out soon about your reward.");
      await load();
    } catch (e) {
      const { title, message } = getApiErrorAlert(e);
      Alert.alert(title, message);
    } finally {
      setClaiming(null);
    }
  };

  const goPrevReward = () => {
    setRewardIndex((i) => (i > 0 ? i - 1 : tiers.length - 1));
  };

  const goNextReward = () => {
    setRewardIndex((i) => (i < tiers.length - 1 ? i + 1 : 0));
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenLabel>tape the night</ScreenLabel>

        <SectionToggle active={section} onChange={setSection} />

        {section === "rankings" ? (
          <>
            <View style={styles.rankCard}>
              <Text style={styles.rankLabel}>Your standing</Text>
              <Text style={styles.pointsValue}>{user?.points ?? 0}</Text>
              <Text style={styles.pointsLabel}>points</Text>
              <Text style={styles.rankMeta}>
                {myRank
                  ? `Rank #${myRank} on the leaderboard`
                  : "Submit vibes to join the rankings"}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Top 5</Text>
            <View style={styles.topFiveList}>
              {topFive.map((entry, index) => (
                <View key={entry.id}>
                  <View style={styles.topRow}>
                    <Text style={[styles.topRank, rankStyle(entry.rank)]}>{entry.rank}</Text>
                    <Text style={styles.topUser} numberOfLines={1}>
                      @{entry.username}
                    </Text>
                    <Text style={styles.topPoints}>{entry.points}</Text>
                  </View>
                  {index < topFive.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
              {topFive.length === 0 ? (
                <Text style={styles.empty}>No rankings yet</Text>
              ) : null}
            </View>
          </>
        ) : (
          <>
            {inReferralPhase ? (
              <View style={styles.referralCard}>
                <Text style={styles.referralLabel}>your code</Text>
                <Text style={styles.referralCode}>{referralCode || "..."}</Text>
                <Button
                  title="share via imessage"
                  variant="secondary"
                  onPress={() => {
                  if (!shareMessage && referralCode) {
                    shareViaIMessage(buildReferralShareMessage(referralCode));
                    return;
                  }
                  shareViaIMessage(shareMessage);
                }}
                />
              </View>
            ) : null}

            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>{heroLabel}</Text>
              <Text style={styles.heroValue}>{heroValue}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(heroProgress * 100, 2)}%` }]} />
              </View>
              <Text style={styles.heroMeta}>{heroMeta}</Text>
            </View>

            {currentTier ? (
              <View style={styles.rewardPager}>
                <TouchableOpacity onPress={goPrevReward} style={styles.pagerBtn} hitSlop={12}>
                  <Text style={styles.pagerArrow}>‹</Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.rewardRow,
                    !isHiddenReward && tierStatus(currentTier) === "ready" && styles.rewardRowReady,
                    !isHiddenReward && tierStatus(currentTier) === "claimed" && styles.rewardRowClaimed,
                  ]}
                >
                  {isHiddenReward ? (
                    <Text style={styles.rewardHidden}>please complete previous challenge</Text>
                  ) : (
                    (() => {
                      const status = tierStatus(currentTier);
                      const [requirement, reward] = currentTier.label.split(" — ");
                      const isReferralTier = currentTier.type === "referral";
                      return (
                        <>
                          <View style={styles.rewardMain}>
                            <Text style={styles.rewardTitle}>{reward ?? currentTier.label}</Text>
                            <Text style={styles.rewardReq}>
                              {isReferralTier
                                ? "invite three friends"
                                : requirement ?? currentTier.label}
                            </Text>
                            <Text style={styles.rewardProgress}>
                              {tierProgressLabel(currentTier)}
                            </Text>
                          </View>
                          <View style={styles.rewardAside}>
                            {status === "locked" && (
                              <View style={[styles.badge, styles.badgeLocked]}>
                                <Text style={styles.badgeTextLocked}>Locked</Text>
                              </View>
                            )}
                            {status === "claimed" && (
                              <View style={[styles.badge, styles.badgeClaimed]}>
                                <Text style={styles.badgeTextClaimed}>
                                  {currentTier.claim?.status ?? "Claimed"}
                                </Text>
                              </View>
                            )}
                            {status === "ready" && (
                              <Button
                                title="Claim"
                                onPress={() => handleClaim(currentTier)}
                                loading={claiming === currentTier.tier}
                              />
                            )}
                          </View>
                        </>
                      );
                    })()
                  )}
                </View>

                <TouchableOpacity onPress={goNextReward} style={styles.pagerBtn} hitSlop={12}>
                  <Text style={styles.pagerArrow}>›</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {tiers.length > 1 ? (
              <View style={styles.dots}>
                {tiers.map((tier, index) => (
                  <View
                    key={tier.tier}
                    style={[styles.dot, index === rewardIndex && styles.dotActive]}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl * 2,
    alignItems: "stretch",
  },
  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: scale(14),
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  toggleDivider: {
    width: 1,
    height: scale(18),
    backgroundColor: colors.border,
  },
  toggleLabel: {
    fontSize: scale(18),
    fontWeight: "700",
    color: colors.textSecondary,
  },
  toggleActive: {
    color: colors.orange,
    fontWeight: "900",
  },
  rankCard: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  rankLabel: {
    ...typography.labelCaps,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  pointsValue: {
    ...typography.stat,
    fontSize: scale(48),
    color: colors.text,
  },
  pointsLabel: {
    color: colors.textSecondary,
    fontSize: scale(15),
    marginTop: spacing.xs,
  },
  rankMeta: {
    color: colors.orange,
    fontSize: scale(15),
    fontWeight: "700",
    marginTop: spacing.md,
    textAlign: "center",
  },
  sectionTitle: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: "center",
    width: "100%",
  },
  topFiveList: {
    width: "100%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scale(18),
  },
  topRank: {
    width: scale(32),
    fontSize: scale(17),
    textAlign: "left",
  },
  topUser: {
    flex: 1,
    marginLeft: scale(12),
    color: colors.orange,
    fontWeight: "700",
    fontSize: scale(16),
    textAlign: "left",
  },
  topPoints: {
    color: colors.text,
    fontWeight: "800",
    fontSize: scale(17),
    textAlign: "right",
    minWidth: scale(40),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  referralCard: {
    ...cardStyle,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    width: "100%",
    alignItems: "center",
    gap: spacing.sm,
  },
  referralLabel: {
    ...typography.labelCaps,
    color: colors.textSecondary,
  },
  referralCode: {
    ...typography.stat,
    fontSize: scale(32),
    color: colors.orange,
    letterSpacing: scale(3),
  },
  heroCard: {
    ...cardStyle,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    width: "100%",
    alignItems: "center",
  },
  heroLabel: {
    ...typography.labelCaps,
    color: colors.textSecondary,
  },
  heroValue: {
    ...typography.stat,
    fontSize: scale(48),
    color: colors.orange,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  track: {
    height: 6,
    width: "100%",
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.full,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  fill: {
    height: "100%",
    backgroundColor: colors.orange,
    borderRadius: radii.full,
  },
  heroMeta: {
    color: colors.textSecondary,
    fontSize: scale(14),
    fontWeight: "600",
    textAlign: "center",
  },
  rewardPager: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  pagerBtn: {
    width: scale(28),
    alignItems: "center",
  },
  pagerArrow: {
    color: colors.textSecondary,
    fontSize: scale(28),
    fontWeight: "300",
  },
  rewardRow: {
    ...cardStyle,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  rewardHidden: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: scale(15),
    fontWeight: "600",
    textAlign: "center",
    textTransform: "lowercase",
  },
  rewardRowReady: {
    borderColor: colors.orange,
  },
  rewardRowClaimed: {
    opacity: 0.72,
  },
  rewardMain: { flex: 1 },
  rewardTitle: {
    color: colors.text,
    fontSize: scale(17),
    fontWeight: "800",
    marginBottom: 2,
  },
  rewardReq: {
    color: colors.textSecondary,
    fontSize: scale(13),
    marginBottom: spacing.xs,
    textTransform: "lowercase",
  },
  rewardProgress: {
    color: colors.textSecondary,
    fontSize: scale(13),
    fontWeight: "600",
  },
  rewardAside: {
    alignItems: "flex-end",
    minWidth: scale(72),
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeLocked: {
    backgroundColor: colors.surfaceLight,
  },
  badgeTextLocked: {
    color: colors.textSecondary,
    fontSize: scale(12),
    fontWeight: "700",
  },
  badgeClaimed: {
    backgroundColor: colors.surfaceLight,
  },
  badgeTextClaimed: {
    color: colors.success,
    fontSize: scale(12),
    fontWeight: "700",
    textTransform: "capitalize",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(6),
    marginTop: spacing.md,
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.orange,
  },
});
