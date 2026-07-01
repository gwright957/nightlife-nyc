import { StyleSheet, TextStyle } from "react-native";

export const fonts = {
  light: "JosefinSans_300Light",
  regular: "JosefinSans_400Regular",
  medium: "JosefinSans_500Medium",
  semiBold: "JosefinSans_600SemiBold",
  bold: "JosefinSans_700Bold",
} as const;

type FontWeight = TextStyle["fontWeight"];

const ICON_FONTS = new Set(["Ionicons", "MaterialIcons", "FontAwesome", "Feather"]);

export { ICON_FONTS };

export function resolveFontFamily(
  fontWeight?: FontWeight,
  fontFamily?: string,
): string {
  if (fontFamily && ICON_FONTS.has(fontFamily)) {
    return fontFamily;
  }

  const weight =
    typeof fontWeight === "number"
      ? String(fontWeight)
      : fontWeight === "bold"
        ? "700"
        : fontWeight === "normal" || fontWeight == null
          ? "400"
          : fontWeight;

  if (weight === "700" || weight === "800" || weight === "900") {
    return fonts.bold;
  }
  if (weight === "600") {
    return fonts.semiBold;
  }
  if (weight === "500") {
    return fonts.medium;
  }
  if (weight === "300" || weight === "200" || weight === "100") {
    return fonts.light;
  }
  return fonts.regular;
}

export function fontStyle(fontWeight: FontWeight = "400") {
  return {
    fontFamily: resolveFontFamily(fontWeight),
    fontWeight: "normal" as const,
  };
}

export function flattenStyle(style: TextStyle | TextStyle[] | undefined) {
  return StyleSheet.flatten(style);
}
