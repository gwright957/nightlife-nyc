import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../../theme";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { AuthStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "ReferralCode">;

export function ReferralCodeScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [referralCode, setReferralCode] = useState("");

  const continueNext = (code?: string) => {
    navigation.navigate("ProfileSetup", { email, referralCode: code });
  };

  const handleContinue = () => {
    continueNext(referralCode.trim() || undefined);
  };

  const handleSkip = () => {
    continueNext(undefined);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>got a referral code?</Text>
        <Text style={styles.subtitle}>
          if a friend invited you, enter their code below. you can skip this step.
        </Text>
        <Input
          value={referralCode}
          onChangeText={(text) => setReferralCode(text.toUpperCase())}
          placeholder="Referral code"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button title="Continue" onPress={handleContinue} />
        <Button title="Skip" variant="ghost" onPress={handleSkip} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    justifyContent: "center",
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: "lowercase",
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
});
