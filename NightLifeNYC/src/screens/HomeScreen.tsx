import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, radii, spacing, typography, cardStyle } from "../theme";
import { api } from "../services/api";
import { FriendVideo, HotVenue } from "../types";
import { genderRatioLabel } from "../utils/genderRatio";
import { useAuthStore } from "../store/authStore";
import { useLocationCheckIn } from "../hooks/useLocationCheckIn";
import { CheckInModal } from "../components/CheckInModal";
import { ScreenLabel } from "../components/ScreenLabel";
import { Screen } from "../components/Screen";
import { SectionToggle } from "../components/SectionToggle";
import { VenueVideoPlayer } from "../components/VenueVideoPlayer";
import { MainTabParamList, RootStackParamList } from "../navigation/types";

type FeedSection = "public" | "private";
type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

const videoWidth = Dimensions.get("window").width - spacing.screen * 2;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const [section, setSection] = useState<FeedSection>("public");
  const [venues, setVenues] = useState<HotVenue[]>([]);
  const [friendVideos, setFriendVideos] = useState<FriendVideo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const nearbyVenue = useAuthStore((s) => s.nearbyVenue);
  const setNearbyVenue = useAuthStore((s) => s.setNearbyVenue);

  useLocationCheckIn();

  const loadPublic = async () => {
    const { venues: data } = await api.getHottestVenues();
    setVenues(data);
  };

  const loadPrivate = async () => {
    const { videos } = await api.getFriendsFeed();
    setFriendVideos(videos);
  };

  const load = async () => {
    try {
      if (section === "public") {
        await loadPublic();
      } else {
        await loadPrivate();
      }
    } catch {
      if (section === "public") {
        setVenues([]);
      } else {
        setFriendVideos([]);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [section])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.orange}
          />
        }
        contentContainerStyle={styles.content}
      >
        <ScreenLabel>scroll through the night</ScreenLabel>

        <SectionToggle
          left={{ key: "public", label: "public" }}
          right={{ key: "private", label: "private" }}
          active={section}
          onChange={setSection}
        />

        {section === "public" ? (
          venues.length === 0 ? (
            <Text style={styles.empty}>No hot spots rated tonight yet</Text>
          ) : (
            venues.map((item, index) => (
              <TouchableOpacity
                key={item.venue.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("VenueDetail", { venueId: item.venue.id })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.venueName}>{item.venue.name}</Text>
                    <Text style={styles.venueMeta}>
                      <Text style={styles.venueType}>{item.venue.type.toUpperCase()}</Text>
                      {" · "}
                      {item.ratingCount} ratings tonight
                    </Text>
                  </View>
                  <Text style={styles.heatScore}>{Math.round(item.heatScore)}</Text>
                </View>

                <View style={styles.statsRow}>
                  <Stat label="Lit" value={item.avgLitScore} />
                  <Stat
                    label="Gender mix"
                    value={item.avgGenderRatio}
                    subtitle={genderRatioLabel(item.avgGenderRatio)}
                  />
                </View>

                {item.latestVideoUrl ? (
                  <Image source={{ uri: item.latestVideoUrl }} style={styles.thumbnail} />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons name="videocam-outline" size={32} color={colors.tabInactive} />
                  </View>
                )}
              </TouchableOpacity>
            ))
          )
        ) : friendVideos.length === 0 ? (
          <Text style={styles.empty}>
            Add friends to see their videos here. You only see uploads from mutual friends.
          </Text>
        ) : (
          friendVideos.map((video) => (
            <View key={video.id} style={styles.friendCard}>
              <View style={styles.friendHeader}>
                <Text style={styles.friendUser}>@{video.user.username}</Text>
                <Text style={styles.friendVenue}>{video.venue.name}</Text>
              </View>
              <VenueVideoPlayer uri={video.videoUrl} width={videoWidth} />
            </View>
          ))
        )}
      </ScrollView>

      <CheckInModal
        visible={!!nearbyVenue}
        venueName={nearbyVenue?.name ?? ""}
        onConfirm={() => {
          if (nearbyVenue) {
            navigation.navigate("Rating", { venue: nearbyVenue });
            setNearbyVenue(null);
          }
        }}
        onDismiss={() => setNearbyVenue(null)}
      />
    </Screen>
  );
}

function Stat({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: number;
  subtitle?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value || "—"}</Text>
      {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl * 2 },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 22,
  },
  card: {
    ...cardStyle,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  friendCard: {
    ...cardStyle,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  friendHeader: {
    width: "100%",
    marginBottom: spacing.sm,
  },
  friendUser: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: 16,
  },
  friendVenue: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rankBadge: {
    backgroundColor: colors.orange,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  rankText: { color: colors.white, fontWeight: "800", fontSize: 14 },
  venueName: { color: colors.text, fontSize: 20, fontWeight: "800" },
  venueMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  venueType: { ...typography.labelCaps, color: colors.orange },
  heatScore: { ...typography.stat, color: colors.text, fontSize: 24 },
  statsRow: {
    flexDirection: "row",
    gap: spacing.xl,
    marginVertical: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: { flex: 1 },
  statLabel: { color: colors.textSecondary, fontSize: 12, marginBottom: 4 },
  statValue: { ...typography.stat, color: colors.text, fontSize: 22 },
  statSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  thumbnail: {
    width: "100%",
    height: 140,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLight,
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: 140,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
