import {
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableWithoutFeedback,
} from "react-native";
import { useRef, useState, useEffect } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../../theme";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { api, setRequestStatusListener } from "../../services/api";
import { getApiErrorAlert } from "../../utils/apiErrors";
import { useAuthStore } from "../../store/authStore";
import { scale } from "../../utils/scale";
import { AuthStackParamList } from "../../navigation/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO_TAP_COUNT = 3;
const DEMO_TAP_WINDOW_MS = 900;
const TEST_EMAIL = "test@gmail.com";

type Props = NativeStackScreenProps<AuthStackParamList, "Email">;

export function EmailScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const setPendingEmail = useAuthStore((s) => s.setPendingEmail);
  const login = useAuthStore((s) => s.login);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRequestStatusListener((status) => {
      setConnecting(status === "retrying");
    });
    return () => setRequestStatusListener(null);
  }, []);

  const normalizedEmail = email.trim().toLowerCase();
  const isTestLogin = normalizedEmail === TEST_EMAIL;

  const handleSubmit = async () => {
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      Alert.alert("Invalid email", "Enter a valid email address");
      return;
    }

    if (isTestLogin) {
      if (!password) {
        Alert.alert("Missing password", "Enter your password");
        return;
      }
      setLoading(true);
      try {
        const { token, user } = await api.devLogin(normalizedEmail, password);
        await login(token, user);
      } catch (e) {
        const { title, message } = getApiErrorAlert(e);
        Alert.alert(title, message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await api.sendOtp(normalizedEmail);
      setPendingEmail(normalizedEmail);
      navigation.navigate("Otp", { email: normalizedEmail });
    } catch (e) {
      const { title, message } = getApiErrorAlert(e);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoPress = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, DEMO_TAP_WINDOW_MS);

    if (tapCount.current < DEMO_TAP_COUNT) return;

    tapCount.current = 0;
    if (tapTimer.current) clearTimeout(tapTimer.current);

    void (async () => {
      try {
        const { token, user } = await api.demoLogin();
        await login(token, user);
      } catch {
        // Silent — hidden dev shortcut
      }
    })();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={handleLogoPress} accessible={false}>
          <Text style={styles.logo} suppressHighlighting>
            afterdark
          </Text>
        </TouchableWithoutFeedback>
        <Text style={styles.subtitle}>Enter your email to get started</Text>
        <Input
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
        />
        {isTestLogin && (
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Password"
            textContentType="password"
          />
        )}
        <Button
          title={
            connecting
              ? "Connecting..."
              : isTestLogin
                ? "Sign In"
                : "Send Code"
          }
          onPress={handleSubmit}
          loading={loading || connecting}
          loadingTitle={connecting ? "Connecting..." : undefined}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    justifyContent: "center",
  },
  logo: {
    ...typography.logo,
    textAlign: "center",
    marginBottom: spacing.md,
    color: colors.white,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: scale(15),
    marginBottom: spacing.lg,
    lineHeight: scale(22),
  },
});
