import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { CompositeNavigationProp } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../theme";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { ScreenLabel } from "../components/ScreenLabel";
import { VenueVideoPlayer } from "../components/VenueVideoPlayer";
import { useAuthStore } from "../store/authStore";
import { useNotificationsStore } from "../store/notificationsStore";
import { api } from "../services/api";
import { scale } from "../utils/scale";
import { UserVideo } from "../types";
import { MainTabParamList, RootStackParamList } from "../navigation/types";

type ProfileNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, "Profile">,
  NativeStackNavigationProp<RootStackParamList>
>;

const videoWidth = Dimensions.get("window").width - spacing.screen * 2;

export function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshUnreadCount = useNotificationsStore((s) => s.refreshUnreadCount);
  const [videos, setVideos] = useState<UserVideo[]>([]);

  const loadVideos = async () => {
    try {
      const { videos: data } = await api.getMyVideos();
      setVideos(data);
    } catch {
      setVideos([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVideos();
      refreshUnreadCount();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert("Log out?", "You'll need to verify your email again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  };

  if (!user) return null;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenLabel>this is you</ScreenLabel>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.fullName}>{user.fullName}</Text>

        <View style={styles.statsRow}>
          <Text style={styles.statValue}>{user.points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>

        <View style={styles.linkRow}>
          <TouchableOpacity onPress={() => navigation.navigate("Inbox")} hitSlop={8}>
            <Text style={styles.linkLabel}>inbox</Text>
          </TouchableOpacity>
          <View style={styles.linkDivider} />
          <TouchableOpacity onPress={() => navigation.navigate("Friends")} hitSlop={8}>
            <Text style={styles.linkLabel}>friends</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Your videos</Text>
        {videos.length === 0 ? (
          <Text style={styles.empty}>No videos uploaded yet</Text>
        ) : (
          videos.map((video) => (
            <View key={video.id} style={styles.videoBlock}>
              <VenueVideoPlayer uri={video.videoUrl} width={videoWidth} />
              <Text style={styles.videoMeta}>{video.venue.name}</Text>
              <Text style={styles.videoDate}>
                {new Date(video.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}

        <View style={styles.logoutWrap}>
          <Button title="Log Out" onPress={handleLogout} variant="secondary" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    paddingBottom: spacing.xxl * 2,
  },
  avatar: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { color: colors.white, fontSize: scale(36), fontWeight: "900" },
  username: {
    ...typography.heading,
    color: colors.orange,
    fontWeight: "800",
    textAlign: "center",
  },
  fullName: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
    fontSize: scale(16),
    textAlign: "center",
  },
  statsRow: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  statValue: { ...typography.stat, color: colors.text },
  statLabel: { color: colors.textSecondary, marginTop: 4, fontSize: scale(13) },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: scale(14),
    marginBottom: spacing.xl,
  },
  linkDivider: {
    width: 1,
    height: scale(18),
    backgroundColor: colors.border,
  },
  linkLabel: {
    fontSize: scale(18),
    fontWeight: "700",
    color: colors.orange,
    textTransform: "lowercase",
  },
  sectionTitle: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: "center",
    width: "100%",
  },
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  videoBlock: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  videoMeta: {
    color: colors.text,
    fontWeight: "700",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  videoDate: {
    color: colors.textSecondary,
    fontSize: scale(13),
    marginTop: spacing.xs,
    textAlign: "center",
  },
  logoutWrap: { marginTop: spacing.lg, width: "100%" },
});
