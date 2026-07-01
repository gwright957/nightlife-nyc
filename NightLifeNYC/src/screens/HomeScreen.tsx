import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, radii, spacing, typography, cardStyle } from "../theme";
import { api } from "../services/api";
import { HotVenue } from "../types";
import { genderRatioLabel } from "../utils/genderRatio";
import { useAuthStore } from "../store/authStore";
import { useLocationCheckIn } from "../hooks/useLocationCheckIn";
import { CheckInModal } from "../components/CheckInModal";
import { ScreenLabel } from "../components/ScreenLabel";
import { Screen } from "../components/Screen";
import { MainTabParamList, RootStackParamList } from "../navigation/types";

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Home">,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const [venues, setVenues] = useState<HotVenue[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const nearbyVenue = useAuthStore((s) => s.nearbyVenue);
  const setNearbyVenue = useAuthStore((s) => s.setNearbyVenue);

  useLocationCheckIn();

  const load = async () => {
    try {
      const { venues: data } = await api.getHottestVenues();
      setVenues(data);
    } catch {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
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

        {venues.map((item, index) => (
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
        ))}

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
  card: {
    ...cardStyle,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
