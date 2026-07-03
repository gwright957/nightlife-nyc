import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../theme";
import { scale } from "../utils/scale";
import { useAuthStore } from "../store/authStore";
import { useNotificationsStore } from "../store/notificationsStore";
import { EmailScreen } from "../screens/auth/EmailScreen";
import { OtpScreen } from "../screens/auth/OtpScreen";
import { ProfileSetupScreen } from "../screens/auth/ProfileSetupScreen";
import { ReferralCodeScreen } from "../screens/auth/ReferralCodeScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { SubmitScreen } from "../screens/SubmitScreen";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { RewardsScreen } from "../screens/RewardsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RatingScreen } from "../screens/RatingScreen";
import { VenueDetailScreen } from "../screens/VenueDetailScreen";
import {
  AuthStackParamList,
  MainTabParamList,
  RootStackParamList,
} from "./types";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICON_SIZE = scale(22);
const SUBMIT_CIRCLE_SIZE = scale(48);

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.orange,
  },
};

function SubmitTabIcon() {
  return (
    <View style={styles.submitCircle}>
      <Ionicons name="add" size={scale(24)} color={colors.white} />
    </View>
  );
}

function ProfileTabIcon({ color, hasUnread }: { color: string; hasUnread: boolean }) {
  return (
    <View>
      <Ionicons name="person" size={TAB_ICON_SIZE} color={color} />
      {hasUnread ? <View style={styles.notificationDot} /> : null}
    </View>
  );
}

function MainTabs() {
  const refreshUnreadCount = useNotificationsStore((s) => s.refreshUnreadCount);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          height: scale(72),
          paddingTop: scale(6),
          paddingBottom: scale(8),
        },
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: scale(10),
          fontWeight: "600",
          marginTop: scale(2),
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarIcon: ({ color }) => {
          if (route.name === "Submit") {
            return <SubmitTabIcon />;
          }

          if (route.name === "Profile") {
            return <ProfileTabIcon color={color} hasUnread={unreadCount > 0} />;
          }

          const icons: Record<string, string> = {
            Home: "flame",
            Search: "search",
            Rewards: "star-outline",
          };
          const iconName = icons[route.name] ?? "ellipse";
          return <Ionicons name={iconName} size={TAB_ICON_SIZE} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Tonight" }} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen
        name="Submit"
        component={SubmitScreen}
        options={{ title: "Submit" }}
      />
      <Tab.Screen name="Rewards" component={RewardsScreen} options={{ title: "Rewards" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Email" component={EmailScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
      <AuthStack.Screen name="ReferralCode" component={ReferralCodeScreen} />
      <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTitleStyle: {
          fontWeight: "700",
          color: colors.text,
        },
        headerTintColor: colors.orange,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <RootStack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: "Leaderboard" }}
      />
      <RootStack.Screen
        name="Rating"
        component={RatingScreen}
        options={{ title: "Rate the Vibe", presentation: "modal" }}
      />
      <RootStack.Screen
        name="VenueDetail"
        component={VenueDetailScreen}
        options={{ title: "Venue" }}
      />
    </RootStack.Navigator>
  );
}

export function Navigation() {
  const token = useAuthStore((s) => s.token);

  return (
    <NavigationContainer theme={navTheme}>
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  submitCircle: {
    width: SUBMIT_CIRCLE_SIZE,
    height: SUBMIT_CIRCLE_SIZE,
    borderRadius: SUBMIT_CIRCLE_SIZE / 2,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -4,
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: colors.error,
    borderWidth: 1,
    borderColor: colors.tabBar,
  },
});
