import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, spacing, cardStyle, radii } from "../theme";
import { BackHeader } from "../components/BackHeader";
import { Screen } from "../components/Screen";
import { useNotificationsStore } from "../store/notificationsStore";
import { api } from "../services/api";
import { getApiErrorAlert } from "../utils/apiErrors";
import { scale } from "../utils/scale";
import { AppNotification } from "../types";
import { RootStackParamList } from "../navigation/types";

function notificationMessage(notification: AppNotification): string {
  const name = notification.actor?.username ?? "someone";
  if (notification.type === "friend_request_received") {
    return `@${name} sent you a friend request`;
  }
  return `@${name} accepted your friend request`;
}

export function InboxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const refreshUnreadCount = useNotificationsStore((s) => s.refreshUnreadCount);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      const { notifications: data } = await api.getNotifications();
      setNotifications(data);
      await refreshUnreadCount();
    } catch {
      setNotifications([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const handleAccept = async (notification: AppNotification) => {
    if (!notification.entityId) return;
    setLoadingActionId(notification.id);
    try {
      await api.acceptFriendRequest(notification.entityId);
      await loadNotifications();
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

  return (
    <Screen>
      <BackHeader title="inbox" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
  empty: {
    color: colors.textSecondary,
    textAlign: "center",
    marginVertical: spacing.lg,
    lineHeight: 22,
  },
});
