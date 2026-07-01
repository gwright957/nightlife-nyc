import { Dimensions } from "react-native";

const BASE_WIDTH = 390;

export function scale(size: number): number {
  const { width } = Dimensions.get("window");
  return size * (width / BASE_WIDTH);
}
