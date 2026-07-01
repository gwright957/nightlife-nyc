import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useState } from "react";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, radii, spacing, typography } from "../theme";
import { Screen } from "../components/Screen";
import { ScreenLabel } from "../components/ScreenLabel";
import { api } from "../services/api";
import { scale } from "../utils/scale";
import { Venue } from "../types";
import { MainTabParamList, RootStackParamList } from "../navigation/types";

type SearchNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Search">,
  NativeStackNavigationProp<RootStackParamList>
>;

export function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const [query, setQuery] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setVenues([]);
      return;
    }
    setLoading(true);
    try {
      const { venues: results } = await api.searchVenues(text);
      setVenues(results);
    } catch {
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenLabel>find your party</ScreenLabel>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={scale(20)} color={colors.white} />
        <TextInput
          value={query}
          onChangeText={handleSearch}
          placeholder=""
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>
      {loading && (
        <ActivityIndicator color={colors.orange} style={{ marginBottom: spacing.md }} />
      )}
      <FlatList
        data={venues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("VenueDetail", { venueId: item.id })}
          >
            <View style={styles.rowBody}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.address}>{item.address}</Text>
            </View>
            <Text style={styles.type}>{item.type}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          query.length >= 2 && !loading ? (
            <Text style={styles.empty}>No venues found</Text>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: scale(16),
    paddingVertical: spacing.sm,
  },
  list: { paddingBottom: spacing.xxl * 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  rowBody: { flex: 1 },
  name: { color: colors.text, fontWeight: "800", fontSize: scale(16) },
  address: {
    color: colors.textSecondary,
    fontSize: scale(13),
    marginTop: 4,
  },
  type: {
    ...typography.labelCaps,
    color: colors.orange,
  },
  empty: { color: colors.textSecondary, textAlign: "center", marginTop: spacing.xl },
});
