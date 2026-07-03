import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Navigation } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/components/SplashScreen';
import { useAuthStore } from './src/store/authStore';
import { colors } from './src/theme';
import { setupFonts } from './src/utils/setupFonts';

setupFonts();

const SPLASH_MIN_MS = 1400;

export default function App() {
  const bootstrap = useAuthStore(s => s.bootstrap);
  const isLoading = useAuthStore(s => s.isLoading);
  const [showSplash, setShowSplash] = useState(true);
  const [bootstrapDone, setBootstrapDone] = useState(false);

  useEffect(() => {
    bootstrap().finally(() => setBootstrapDone(true));
  }, [bootstrap]);

  useEffect(() => {
    if (!bootstrapDone) return;

    const timer = setTimeout(() => setShowSplash(false), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, [bootstrapDone]);

  if (showSplash || isLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />
          <SplashScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <Navigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
