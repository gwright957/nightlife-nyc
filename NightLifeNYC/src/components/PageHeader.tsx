import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { colors, spacing, typography } from "../theme";
import { scale } from "../utils/scale";

interface Props {
  title: string;
  subtitle?: string;
  centered?: boolean;
  rightAction?: {
    label: string;
    onPress: () => void;
  };
}

export function PageHeader({ title, subtitle, centered = true, rightAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.side} />
        <View style={[styles.main, centered && styles.mainCentered]}>
          <Text style={[styles.title, centered && styles.titleCentered]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, centered && styles.subtitleCentered]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.side}>
          {rightAction ? (
            <TouchableOpacity onPress={rightAction.onPress} hitSlop={8}>
              <Text style={styles.action}>{rightAction.label}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  side: {
    width: scale(88),
    alignItems: "flex-end",
    justifyContent: "center",
    minHeight: scale(28),
  },
  main: {
    flex: 1,
  },
  mainCentered: {
    alignItems: "center",
  },
  title: {
    ...typography.pageTitle,
    color: colors.text,
  },
  titleCentered: {
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: scale(15),
    marginTop: spacing.xs,
    lineHeight: scale(22),
  },
  subtitleCentered: {
    textAlign: "center",
  },
  action: {
    color: colors.orange,
    fontSize: scale(13),
    fontWeight: "700",
  },
});
