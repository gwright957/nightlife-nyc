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
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, typography, cardStyle, radii } from "../theme";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Screen } from "../components/Screen";
import { SectionToggle } from "../components/SectionToggle";
import { VenueVideoPlayer } from "../components/VenueVideoPlayer";
import { useAuthStore } from "../store/authStore";
import { useNotificationsStore } from "../store/notificationsStore";
import { api } from "../services/api";
import { getApiErrorAlert } from "../utils/apiErrors";
import { scale } from "../utils/scale";
import { AppNotification, FriendProfile, UserVideo } from "../types";

type ProfileSection = "inbox" | "friends";

const videoWidth = Dimensions.get("window").width - spacing.screen * 2;

function notificationMessage(notification: AppNotification): string {
  const name = notification.actor?.username ?? "someone";
  if (notification.type === "friend_request_received") {
    return `@${name} sent you a friend request`;
  }
  return `@${name} accepted your friend request`;
}

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshUnreadCount = useNotificationsStore((s) => s.refreshUnreadCount);
  const [section, setSection] = useState<ProfileSection>("inbox");
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const loadVideos = async () => {
    try {
      const { videos: data } = await api.getMyVideos();
      setVideos(data);
    } catch {
      setVideos([]);
    }
  };

  const loadFriends = async () => {
    try {
      const { friends: data } = await api.getFriends();
      setFriends(data);
    } catch {
      setFriends([]);
    }
  };

  const loadNotifications = async () => {
    try {
      const { notifications: data } = await api.getNotifications();
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadVideos(), loadFriends(), loadNotifications(), refreshUnreadCount()]);
  };

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const handleAccept = async (notification: AppNotification) => {
    if (!notification.entityId) return;
    setLoadingActionId(notification.id);
    try {
      await api.acceptFriendRequest(notification.entityId);
      await loadAll();
    } catch (error) {
      const { title, message } = getApiErrorAlert(error);
      Alert.alert(title, message);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDecline = async (notification: AppNotification) => {
    if (!notification.entityId) return;
    setLoadingActionId(notification.id);
    try {
      await api.declineFriendRequest(notification.entityId);
      await loadNotifications();
      await refreshUnreadCount();
    } catch (error) {
      const { title, message } = getApiErrorAlert(error);
      Alert.alert(title, message);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleMarkRead = async (notification: AppNotification) => {
    if (notification.readAt) return;
    try {
      await api.markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((entry) =>
          entry.id === notification.id
            ? { ...entry, readAt: new Date().toISOString() }
            : entry
        )
      );
      await refreshUnreadCount();
    } catch {
      // ignore
    }
  };

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

        <SectionToggle
          left={{ key: "inbox", label: "inbox" }}
          right={{ key: "friends", label: "friends" }}
          active={section}
          onChange={setSection}
        />

        {section === "inbox" ? (
          <View style={styles.panel}>
            {notifications.length === 0 ? (
              <Text style={styles.empty}>No notifications yet</Text>
            ) : (
              notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationRow,
                    !notification.readAt && styles.notificationUnread,
                  ]}
                  onPress={() => handleMarkRead(notification)}
                >
                  <Text style={styles.notificationText}>
                    {notificationMessage(notification)}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </Text>
                  {notification.type === "friend_request_received" &&
                    !notification.readAt && (
                      <View style={styles.notificationActions}>
                        <TouchableOpacity
                          style={styles.acceptButton}
                          disabled={loadingActionId === notification.id}
                          onPress={() => handleAccept(notification)}
                        >
                          <Text style={styles.acceptButtonText}>accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.declineButton}
                          disabled={loadingActionId === notification.id}
                          onPress={() => handleDecline(notification)}
                        >
                          <Text style={styles.declineButtonText}>decline</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
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
        )}

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
  panel: {
    ...cardStyle,
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  notificationRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  notificationUnread: {
    backgroundColor: colors.surfaceLight,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  notificationText: {
    color: colors.text,
    fontWeight: "600",
    lineHeight: 22,
  },
  notificationTime: {
    color: colors.textSecondary,
    fontSize: scale(12),
    marginTop: spacing.xs,
  },
  notificationActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.orange,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  acceptButtonText: {
    color: colors.white,
    fontWeight: "800",
    textTransform: "lowercase",
  },
  declineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  declineButtonText: {
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "lowercase",
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
    marginVertical: spacing.lg,
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
