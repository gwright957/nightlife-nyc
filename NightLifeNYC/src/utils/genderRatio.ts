export function genderRatioLabel(value: number): string {
  if (value <= 3) return "Mostly guys";
  if (value >= 8) return "Mostly girls";
  if (value >= 4 && value <= 6) return "Even mix";
  if (value < 5) return "More guys";
  return "More girls";
}
