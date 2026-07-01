import { StyleSheet, Text, TextProps } from "react-native";
import { colors } from "../theme";
import { scale } from "../utils/scale";

interface Props extends TextProps {
  children: string;
}

/** Shared top-left lowercase screen label used across tabs */
export function ScreenLabel({ children, style, ...rest }: Props) {
  return (
    <Text style={[styles.label, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.white,
    fontSize: scale(14),
    fontWeight: "400",
    textAlign: "left",
    lineHeight: scale(20),
    marginBottom: scale(20),
    alignSelf: "stretch",
    width: "100%",
  },
});
