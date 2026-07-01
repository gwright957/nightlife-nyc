import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../../theme";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { api, setRequestStatusListener } from "../../services/api";
import { getApiErrorAlert } from "../../utils/apiErrors";
import { useAuthStore } from "../../store/authStore";
import { AuthStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Otp">;

export function OtpScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [resending, setResending] = useState(false);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    setRequestStatusListener((status) => {
      setConnecting(status === "retrying");
    });
    return () => setRequestStatusListener(null);
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    try {
      const result = await api.verifyOtp(email, code);
      if (result.isNewUser) {
        navigation.navigate("ReferralCode", { email });
      } else if (result.token && result.user) {
        await login(result.token, result.user);
      } else {
        Alert.alert(
          "Server error",
          "Verification succeeded but no session was returned. Try again."
        );
      }
    } catch (e) {
      const { title, message } = getApiErrorAlert(e);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.sendOtp(email);
      Alert.alert("Sent", "A new code has been sent to your email");
    } catch (e) {
      const { title, message } = getApiErrorAlert(e);
      Alert.alert(title, message);
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>Code sent to {email}</Text>
      <Input
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        style={styles.codeInput}
      />
      <Button
        title="Verify"
        onPress={handleVerify}
        loading={loading || connecting}
        loadingTitle={connecting ? "Connecting..." : undefined}
      />
      <TouchableOpacity onPress={handleResend} disabled={resending}>
        <Text style={styles.resend}>
          {resending ? "Sending..." : "Resend code"}
        </Text>
      </TouchableOpacity>
      </View>
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
  title: { ...typography.pageTitle, color: colors.text, marginBottom: spacing.sm },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.lg },
  codeInput: {
    fontSize: 28,
    letterSpacing: 8,
    textAlign: "center",
    fontWeight: "700",
  },
  resend: {
    color: colors.orange,
    textAlign: "center",
    marginTop: spacing.lg,
    fontWeight: "600",
  },
});
