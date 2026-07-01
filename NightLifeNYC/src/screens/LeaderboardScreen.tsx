import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing } from "../theme";
import { scale } from "../utils/scale";
import { Screen } from "../components/Screen";
import { api } from "../services/api";
import { LeaderboardEntry } from "../types";

function rankStyle(rank: number) {
  if (rank <= 3) {
    return {
      fontSize: scale(rank === 1 ? 22 : rank === 2 ? 20 : 18),
      fontWeight: (rank === 1 ? "900" : "800") as "900" | "800",
      color: colors.orange,
    };
  }
  return {
    fontSize: scale(17),
    fontWeight: "700" as const,
    color: colors.text,
  };
}

export function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const { leaderboard } = await api.getLeaderboard();
      setEntries(leaderboard);
    } catch {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  return (
    <Screen>
      <Text style={styles.subtitle}>Top vibe reporters in NYC</Text>
      <FlatList
        style={styles.list}
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.orange}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.rank, rankStyle(item.rank)]}>{item.rank}</Text>
            <Text style={styles.username} numberOfLines={1}>
              @{item.username}
            </Text>
            <Text style={styles.points}>{item.points}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No rankings yet</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textSecondary,
    fontSize: scale(15),
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: scale(22),
  },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl * 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scale(30),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  rank: {
    width: scale(32),
    textAlign: "left",
  },
  username: {
    flex: 1,
    textAlign: "left",
    marginLeft: scale(12),
    color: colors.orange,
    fontWeight: "700",
    fontSize: scale(16),
  },
  points: {
    marginLeft: spacing.sm,
    textAlign: "right",
    color: colors.text,
    fontWeight: "800",
    fontSize: scale(17),
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: scale(24),
  },
});
