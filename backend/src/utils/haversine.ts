const FEET_TO_METERS = 0.3048;

export const CHECK_IN_RADIUS_METERS = 75;
export const RATING_SUBMIT_RADIUS_FEET = 500;
export const RATING_SUBMIT_RADIUS_METERS =
  RATING_SUBMIT_RADIUS_FEET * FEET_TO_METERS;

const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRadiusMeters(
  userLat: number,
  userLng: number,
  venueLat: number,
  venueLng: number,
  radiusMeters: number
): boolean {
  return (
    haversineDistanceMeters(userLat, userLng, venueLat, venueLng) <= radiusMeters
  );
}

export function isWithinCheckInRadius(
  userLat: number,
  userLng: number,
  venueLat: number,
  venueLng: number
): boolean {
  return isWithinRadiusMeters(
    userLat,
    userLng,
    venueLat,
    venueLng,
    CHECK_IN_RADIUS_METERS
  );
}

export function isWithinRatingSubmitRadius(
  userLat: number,
  userLng: number,
  venueLat: number,
  venueLng: number
): boolean {
  return isWithinRadiusMeters(
    userLat,
    userLng,
    venueLat,
    venueLng,
    RATING_SUBMIT_RADIUS_METERS
  );
}
