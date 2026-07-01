import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, radii, spacing, typography } from "../theme";
import { Screen } from "../components/Screen";
import { ScreenLabel } from "../components/ScreenLabel";
import { api, RATING_SUBMIT_RADIUS_METERS } from "../services/api";
import { getApiErrorAlert } from "../utils/apiErrors";
import { getCurrentCoords } from "../hooks/useLocationCheckIn";
import { scale } from "../utils/scale";
import { NearbyVenue } from "../types";
import { MainTabParamList, RootStackParamList } from "../navigation/types";

type SubmitNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Submit">,
  NativeStackNavigationProp<RootStackParamList>
>;

type ScreenState =
  | { kind: "loading" }
  | { kind: "out_of_range" }
  | { kind: "choose"; venues: NearbyVenue[] }
  | { kind: "error"; message: string };

export function SubmitScreen() {
  const navigation = useNavigation<SubmitNav>();
  const [state, setState] = useState<ScreenState>({ kind: "loading" });

  const checkLocation = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const coords = await getCurrentCoords();
      const { venues } = await api.getNearbyVenues(
        coords.lat,
        coords.lng,
        RATING_SUBMIT_RADIUS_METERS
      );

      if (venues.length === 0) {
        setState({ kind: "out_of_range" });
        return;
      }

      setState({ kind: "choose", venues });
    } catch (e) {
      const { title, message } = getApiErrorAlert(e);
      setState({
        kind: "error",
        message: `${title}\n${message}`,
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkLocation();
    }, [checkLocation])
  );

  const header = (
    <ScreenLabel>please get closer to one of our bars or clubs</ScreenLabel>
  );

  if (state.kind === "loading") {
    return (
      <Screen>
        {header}
        <View style={styles.centerBody}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
      </Screen>
    );
  }

  if (state.kind === "out_of_range") {
    return (
      <Screen>
        {header}
        <View style={styles.centerBody}>
          <Ionicons name="location-outline" size={scale(48)} color={colors.tabInactive} />
          <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (state.kind === "error") {
    return (
      <Screen>
        {header}
        <View style={styles.centerBody}>
          <TouchableOpacity style={styles.retryBtn} onPress={checkLocation}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <ScrollView contentContainerStyle={styles.content}>
        {state.venues.map((venue) => (
          <TouchableOpacity
            key={venue.id}
            style={styles.venueCard}
            onPress={() => navigation.navigate("Rating", { venue })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.venueName}>{venue.name}</Text>
              <Text style={styles.venueMeta}>
                <Text style={styles.venueType}>{venue.type.toUpperCase()}</Text>
                {" · "}
                {Math.round(venue.distanceMeters)}m away
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.tabInactive} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  content: { paddingBottom: spacing.xxl * 2 },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  retryText: { color: colors.orange, fontWeight: "700" },
  venueCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  venueName: { color: colors.text, fontSize: scale(17), fontWeight: "800" },
  venueMeta: { color: colors.textSecondary, fontSize: scale(12), marginTop: 4 },
  venueType: { ...typography.labelCaps, color: colors.orange },
});
