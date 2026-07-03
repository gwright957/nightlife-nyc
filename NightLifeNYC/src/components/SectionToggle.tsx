import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, spacing } from "../theme";
import { scale } from "../utils/scale";

type SectionToggleProps<T extends string> = {
  left: { key: T; label: string };
  right: { key: T; label: string };
  active: T;
  onChange: (section: T) => void;
};

export function SectionToggle<T extends string>({
  left,
  right,
  active,
  onChange,
}: SectionToggleProps<T>) {
  return (
    <View style={styles.toggleWrap}>
      <TouchableOpacity onPress={() => onChange(left.key)} hitSlop={8}>
        <Text style={[styles.toggleLabel, active === left.key && styles.toggleActive]}>
          {left.label}
        </Text>
      </TouchableOpacity>
      <View style={styles.toggleDivider} />
      <TouchableOpacity onPress={() => onChange(right.key)} hitSlop={8}>
        <Text style={[styles.toggleLabel, active === right.key && styles.toggleActive]}>
          {right.label}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: scale(14),
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  toggleDivider: {
    width: 1,
    height: scale(18),
    backgroundColor: colors.border,
  },
  toggleLabel: {
    fontSize: scale(18),
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "lowercase",
  },
  toggleActive: {
    color: colors.orange,
    fontWeight: "900",
  },
});
