import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { colors, radii, spacing, cardStyle } from "../theme";

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent?: string;
}

export function ScoreSlider({ label, value, onChange, accent = colors.orange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.valueBadge, { backgroundColor: `${accent}18` }]}>
          <Text style={[styles.value, { color: accent }]}>{value}</Text>
        </View>
      </View>
      <Slider
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    ...cardStyle,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  valueBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minWidth: 36,
    alignItems: "center",
  },
  value: {
    fontSize: 18,
    fontWeight: "900",
  },
});
