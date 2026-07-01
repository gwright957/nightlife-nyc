import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  return true;
}

function getPosition(options: {
  enableHighAccuracy: boolean;
}): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      error => reject(error),
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  });
}

export function useLocationCheckIn() {
  const token = useAuthStore(s => s.token);
  const setNearbyVenue = useAuthStore(s => s.setNearbyVenue);
  const nearbyVenue = useAuthStore(s => s.nearbyVenue);
  const lastChecked = useRef<number>(0);

  const checkLocation = async () => {
    if (!token) return;

    const now = Date.now();
    if (now - lastChecked.current < 30000) return;
    lastChecked.current = now;

    const granted = await requestLocationPermission();
    if (!granted) return;

    try {
      const coords = await getPosition({ enableHighAccuracy: false });
      const { venues } = await api.getNearbyVenues(coords.lat, coords.lng);
      if (venues.length > 0 && !nearbyVenue) {
        setNearbyVenue(venues[0]);
      }
    } catch {
      // silently ignore location check failures
    }
  };

  useEffect(() => {
    if (!token) return;

    checkLocation();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        lastChecked.current = 0;
        checkLocation();
      }
    });

    return () => sub.remove();
  }, [token]);
}

export async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  const granted = await requestLocationPermission();
  if (!granted) {
    throw new Error('Location permission is required');
  }

  return getPosition({ enableHighAccuracy: true });
}
