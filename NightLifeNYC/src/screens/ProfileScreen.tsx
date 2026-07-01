import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, typography, cardStyle } from "../theme";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Screen } from "../components/Screen";
import { VenueVideoPlayer } from "../components/VenueVideoPlayer";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import { scale } from "../utils/scale";
import { UserVideo } from "../types";

const videoWidth = Dimensions.get("window").width - spacing.screen * 2;

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
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
        <View style={styles.headerWrap}>
          <PageHeader title="Profile" />
        </View>

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

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Member since</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </View>
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
  headerWrap: {
    alignSelf: "stretch",
    width: "100%",
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
  infoCard: {
    ...cardStyle,
    width: "100%",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: { color: colors.textSecondary },
  infoValue: { color: colors.text, fontWeight: "600" },
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
