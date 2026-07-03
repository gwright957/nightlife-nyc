import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useState } from "react";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, radii, spacing, typography } from "../theme";
import { Screen } from "../components/Screen";
import { ScreenLabel } from "../components/ScreenLabel";
import { SectionToggle } from "../components/SectionToggle";
import { api } from "../services/api";
import { getApiErrorAlert } from "../utils/apiErrors";
import { scale } from "../utils/scale";
import { UserSearchResult, Venue } from "../types";
import { MainTabParamList, RootStackParamList } from "../navigation/types";

type SearchSection = "parties" | "friends";
type SearchNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Search">,
  NativeStackNavigationProp<RootStackParamList>
>;

export function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const [section, setSection] = useState<SearchSection>("parties");
  const [query, setQuery] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const searchPlaceholder =
    section === "parties" ? "find parties" : "find friends";

  const runSearch = async (text: string, activeSection: SearchSection) => {
    if (text.length < 1) {
      setVenues([]);
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      if (activeSection === "parties") {
        const { venues: results } = await api.searchVenues(text);
        setVenues(results);
        setUsers([]);
      } else {
        const { users: results } = await api.searchUsers(text);
        setUsers(results);
        setVenues([]);
      }
    } catch {
      setVenues([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    runSearch(text, section);
  };

  const handleSectionChange = (next: SearchSection) => {
    setSection(next);
    runSearch(query, next);
  };

  const handleAddFriend = async (user: UserSearchResult) => {
    setActionUserId(user.id);
    try {
      await api.sendFriendRequest(user.id);
      setUsers((current) =>
        current.map((entry) =>
          entry.id === user.id
            ? { ...entry, relationshipStatus: "pending_sent" }
            : entry
        )
      );
      Alert.alert("Request sent", `@${user.username} will see your friend request.`);
    } catch (error) {
      const { title, message } = getApiErrorAlert(error);
      Alert.alert(title, message);
    } finally {
      setActionUserId(null);
    }
  };

  const renderFriendAction = (user: UserSearchResult) => {
    if (user.relationshipStatus === "friends") {
      return <Text style={styles.statusLabel}>friends</Text>;
    }
    if (user.relationshipStatus === "pending_sent") {
      return <Text style={styles.statusLabel}>pending</Text>;
    }
    if (user.relationshipStatus === "pending_received") {
      return <Text style={styles.statusLabel}>requested you</Text>;
    }

    return (
      <TouchableOpacity
        style={styles.addButton}
        disabled={actionUserId === user.id}
        onPress={() => handleAddFriend(user)}
      >
        <Text style={styles.addButtonText}>
          {actionUserId === user.id ? "..." : "add"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <ScreenLabel>find your party</ScreenLabel>

      <SectionToggle
        left={{ key: "parties", label: "parties" }}
        right={{ key: "friends", label: "friends" }}
        active={section}
        onChange={handleSectionChange}
      />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={scale(20)} color={colors.white} />
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>

      {loading && (
        <ActivityIndicator color={colors.orange} style={{ marginBottom: spacing.md }} />
      )}

      {section === "parties" ? (
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
            query.length >= 1 && !loading ? (
              <Text style={styles.empty}>No venues found</Text>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowBody}>
                <Text style={styles.name}>@{item.username}</Text>
                <Text style={styles.address}>{item.fullName}</Text>
              </View>
              {renderFriendAction(item)}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={
            query.length >= 1 && !loading ? (
              <Text style={styles.empty}>No users found</Text>
            ) : null
          }
        />
      )}
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
    textTransform: "lowercase",
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
  addButton: {
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addButtonText: {
    color: colors.orange,
    fontWeight: "800",
    textTransform: "lowercase",
  },
  statusLabel: {
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "lowercase",
  },
});
