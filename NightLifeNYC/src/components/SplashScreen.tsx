import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";
import { scale } from "../utils/scale";
import { fontStyle } from "../utils/fonts";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>afterdark</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    ...fontStyle("700"),
    color: colors.orange,
    fontSize: scale(42),
    letterSpacing: scale(1),
    textTransform: "lowercase",
  },
});
