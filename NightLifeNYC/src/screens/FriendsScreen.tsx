import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, cardStyle } from "../theme";
import { BackHeader } from "../components/BackHeader";
import { Screen } from "../components/Screen";
import { api } from "../services/api";
import { scale } from "../utils/scale";
import { FriendProfile } from "../types";
import { RootStackParamList } from "../navigation/types";

export function FriendsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [friends, setFriends] = useState<FriendProfile[]>([]);

  const loadFriends = async () => {
    try {
      const { friends: data } = await api.getFriends();
      setFriends(data);
    } catch {
      setFriends([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [])
  );

  return (
    <Screen>
      <BackHeader title="friends" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          {friends.length === 0 ? (
            <Text style={styles.empty}>No friends yet. Search usernames to add people.</Text>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} style={styles.friendRow}>
                <View>
                  <Text style={styles.friendName}>@{friend.username}</Text>
                  <Text style={styles.friendMeta}>{friend.fullName}</Text>
                </View>
                <Text style={styles.friendPoints}>{friend.points} pts</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl * 2,
  },
  panel: {
    ...cardStyle,
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  friendName: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: scale(16),
  },
  friendMeta: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  friendPoints: {
    color: colors.text,
    fontWeight: "700",
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    marginVertical: spacing.lg,
    lineHeight: 22,
  },
});
