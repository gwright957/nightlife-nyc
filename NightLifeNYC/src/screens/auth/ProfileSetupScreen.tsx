import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../../theme";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { api } from "../../services/api";
import { getApiErrorAlert } from "../../utils/apiErrors";
import { useAuthStore } from "../../store/authStore";
import { AuthStackParamList } from "../../navigation/types";
import {
  formatBirthdayInput,
  parseBirthdayToIso,
  validateBirthdayInput,
} from "../../utils/birthdayInput";

type Props = NativeStackScreenProps<AuthStackParamList, "ProfileSetup">;

export function ProfileSetupScreen({ route }: Props) {
  const { email, referralCode } = route.params;
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleBirthdayChange = (text: string) => {
    setBirthday(formatBirthdayInput(text));
  };

  const handleSubmit = async () => {
    if (!username || !fullName || !birthday) {
      Alert.alert("Missing info", "Fill in all fields");
      return;
    }

    const birthdayError = validateBirthdayInput(birthday);
    if (birthdayError) {
      Alert.alert("Invalid birthday", birthdayError);
      return;
    }

    const isoBirthday = parseBirthdayToIso(birthday);
    if (!isoBirthday) {
      Alert.alert("Invalid birthday", "Enter a valid birthday (MM/DD/YYYY)");
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await api.register({
        email,
        username,
        fullName,
        birthday: isoBirthday,
        referralCode,
      });
      await login(token, user);
    } catch (e) {
      const { title, message } = getApiErrorAlert(e);
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={styles.title}>Create your profile</Text>
      <Text style={styles.subtitle}>You're almost in. Tell us about yourself.</Text>
      <Input
        value={username}
        onChangeText={setUsername}
        placeholder="Username"
        autoCapitalize="none"
      />
      <Input value={fullName} onChangeText={setFullName} placeholder="Full name" />
      <Input
        value={birthday}
        onChangeText={handleBirthdayChange}
        placeholder="Birthday (MM/DD/YYYY)"
        keyboardType="number-pad"
        maxLength={10}
      />
      <Button title="Join the party" onPress={handleSubmit} loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: { ...typography.pageTitle, color: colors.text, marginBottom: spacing.sm },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.lg },
});
