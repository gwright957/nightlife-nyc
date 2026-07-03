import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { colors, spacing } from "../theme";
import { scale } from "../utils/scale";

type Props = {
  title: string;
  onBack: () => void;
};

export function BackHeader({ title, onBack }: Props) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={scale(24)} color={colors.white} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  title: {
    color: colors.white,
    fontSize: scale(14),
    fontWeight: "400",
    textTransform: "lowercase",
  },
});
