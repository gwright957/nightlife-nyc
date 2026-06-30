export function getTonightSince(): Date {
  const since = new Date();
  since.setHours(18, 0, 0, 0);
  if (since.getTime() > Date.now()) {
    since.setDate(since.getDate() - 1);
  }
  return since;
}

export function computeVenueHeatScore(
  ratings: { litScore: number; genderRatio: number; createdAt: Date }[]
): {
  heatScore: number;
  avgLitScore: number;
  avgGenderRatio: number;
  ratingCount: number;
} {
  if (ratings.length === 0) {
    return { heatScore: 0, avgLitScore: 0, avgGenderRatio: 0, ratingCount: 0 };
  }

  const now = Date.now();
  let weightedLit = 0;
  let weightedGender = 0;
  let totalWeight = 0;

  for (const rating of ratings) {
    const ageHours = (now - rating.createdAt.getTime()) / (1000 * 60 * 60);
    const weight = Math.exp(-ageHours / 3);
    weightedLit += rating.litScore * weight;
    weightedGender += rating.genderRatio * weight;
    totalWeight += weight;
  }

  const avgLitScore = weightedLit / totalWeight;
  const avgGenderRatio = weightedGender / totalWeight;
  const ratingCount = ratings.length;
  const heatScore =
    avgLitScore * 0.55 + avgGenderRatio * 0.25 + Math.min(ratingCount * 0.5, 3);

  return {
    heatScore,
    avgLitScore: Math.round(avgLitScore * 10) / 10,
    avgGenderRatio: Math.round(avgGenderRatio * 10) / 10,
    ratingCount,
  };
}
