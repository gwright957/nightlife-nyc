import { StyleSheet, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { colors, radii, spacing } from "../theme";

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  loadingTitle?: string;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  loading,
  loadingTitle,
  variant = "primary",
  disabled,
}: Props) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";
  const isDestructive = variant === "destructive";
  const showLoading = loading;
  const label = showLoading ? (loadingTitle ?? title) : title;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        isDestructive && styles.destructive,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {showLoading ? (
        <>
          <ActivityIndicator
            color={
              isPrimary
                ? colors.white
                : isDestructive
                  ? colors.destructiveText
                  : colors.orange
            }
          />
          {loadingTitle ? (
            <Text
              style={[
                styles.text,
                styles.loadingText,
                isPrimary && styles.primaryText,
                isSecondary && styles.secondaryText,
                isGhost && styles.ghostText,
                isDestructive && styles.destructiveText,
              ]}
            >
              {label}
            </Text>
          ) : null}
        </>
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary && styles.primaryText,
            isSecondary && styles.secondaryText,
            isGhost && styles.ghostText,
            isDestructive && styles.destructiveText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.orange,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  destructive: {
    backgroundColor: colors.destructive,
  },
  disabled: {
    opacity: 0.55,
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.orange,
  },
  ghostText: {
    color: colors.orange,
  },
  destructiveText: {
    color: colors.destructiveText,
  },
});
