import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radii, spacing, typography, cardStyle } from "../theme";
import { api } from "../services/api";
import { getApiErrorAlert } from "../utils/apiErrors";
import { genderRatioLabel } from "../utils/genderRatio";
import {
  isWithinRatingSubmitRadius,
  RATING_OUT_OF_RANGE_MESSAGE,
} from "../utils/haversine";
import { getCurrentCoords } from "../hooks/useLocationCheckIn";
import { Button } from "../components/Button";
import { Venue, VenueTonightStats, VenueVideo } from "../types";
import { RootStackParamList } from "../navigation/types";
import { VenueVideoPlayer } from "../components/VenueVideoPlayer";

type Props = NativeStackScreenProps<RootStackParamList, "VenueDetail">;

export function VenueDetailScreen({ route, navigation }: Props) {
  const { venueId } = route.params;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [stats, setStats] = useState<VenueTonightStats | null>(null);
  const [videos, setVideos] = useState<VenueVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVenueTonight(venueId);
      setVenue(data.venue);
      setStats(data.stats);
      setVideos(data.videos);
    } catch (e) {
      const { title, message } = getApiErrorAlert(e);
      if (message.toLowerCase().includes("not found")) {
        setVenue(null);
        setStats(null);
      } else {
        setError(`${title}\n${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [venueId]);

  const handleSubmitRating = async () => {
    if (!venue) return;

    setCheckingLocation(true);
    try {
      const coords = await getCurrentCoords();
      if (
        !isWithinRatingSubmitRadius(
          coords.lat,
          coords.lng,
          venue.lat,
          venue.lng
        )
      ) {
        Alert.alert("Not in range", RATING_OUT_OF_RANGE_MESSAGE);
        return;
      }

      navigation.navigate("Rating", { venue });
    } catch (e) {
      Alert.alert(
        "Location required",
        e instanceof Error ? e.message : "Could not verify your location"
      );
    } finally {
      setCheckingLocation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.orange} size="large" />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Venue not found</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? "Failed to load venue details"}</Text>
        <TouchableOpacity onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{venue.name}</Text>
      <Text style={styles.address}>{venue.address}</Text>
      <Text style={styles.type}>{venue.type.toUpperCase()}</Text>

      <Button
        title="Submit a Rating"
        onPress={handleSubmitRating}
        loading={checkingLocation}
      />

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Tonight's Vibe</Text>
        {stats.ratingCount === 0 ? (
          <Text style={styles.noRatings}>No ratings yet tonight</Text>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatBlock label="Lit Score" value={stats.avgLitScore} />
              <StatBlock
                label="Gender mix"
                value={genderRatioLabel(stats.avgGenderRatio)}
                text
              />
              <StatBlock label="Line" value={stats.dominantLineLength} text />
            </View>
            <Text style={styles.ratingCount}>{stats.ratingCount} ratings tonight</Text>
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Videos Tonight</Text>
      {videos.length === 0 ? (
        <Text style={styles.empty}>No videos yet tonight</Text>
      ) : (
        videos.map((video) => (
          <View key={video.id} style={styles.videoCard}>
            <VenueVideoPlayer uri={video.videoUrl} width={videoWidth} />
            <Text style={styles.videoMeta}>@{video.user.username}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function StatBlock({
  label,
  value,
  text,
}: {
  label: string;
  value: string | number;
  text?: boolean;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, text && styles.statText]}>
        {value || "—"}
      </Text>
    </View>
  );
}

const videoWidth = Dimensions.get("window").width - spacing.lg * 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  error: { color: colors.textSecondary, textAlign: "center" },
  retryBtn: { marginTop: spacing.lg },
  retryText: { color: colors.orange, fontWeight: "700" },
  title: { ...typography.pageTitle, color: colors.text, fontSize: 28 },
  address: { color: colors.textSecondary, marginTop: spacing.xs },
  type: {
    ...typography.labelCaps,
    color: colors.orange,
    marginVertical: spacing.md,
  },
  statsCard: {
    ...cardStyle,
    padding: spacing.lg,
    marginVertical: spacing.lg,
  },
  statsTitle: {
    ...typography.sectionHeader,
    color: colors.text,
    marginBottom: spacing.md,
  },
  noRatings: { color: colors.textSecondary, textAlign: "center" },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statBlock: { alignItems: "center" },
  statLabel: { color: colors.textSecondary, fontSize: 12 },
  statValue: { ...typography.stat, color: colors.text, fontSize: 24, marginTop: 4 },
  statText: { fontSize: 16, textTransform: "capitalize", fontWeight: "800" },
  ratingCount: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    color: colors.text,
    marginBottom: spacing.md,
  },
  empty: { color: colors.textSecondary },
  videoCard: { marginBottom: spacing.md },
  videoMeta: {
    color: colors.orange,
    marginTop: spacing.xs,
    fontWeight: "800",
  },
});
