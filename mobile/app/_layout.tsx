import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { api, setUnauthorizedHandler } from '../services/api';
import { Colors } from '../constants/colors';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const DEV_BYPASS_AUTH = false; // set to true to skip login

function AuthGuard() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore();
  const { profile, fetchProfile } = useProfileStore();
  const segments = useSegments();
  const router = useRouter();

  // Initial load + register 401 handler
  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      router.replace('/(tabs)');
      return;
    }
    setUnauthorizedHandler(() => {
      useAuthStore.getState().logout();
    });
    loadFromStorage();
  }, []);

  // React to auth state changes (login / logout)
  useEffect(() => {
    if (DEV_BYPASS_AUTH) return;
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!isAuthenticated) {
      // Logged out → always go to login
      router.replace('/(auth)/login');
      return;
    }

    // Logged in → fetch profile if needed
    if (!profile) {
      fetchProfile().then(() => {
        const p = useProfileStore.getState().profile;
        if (!p?.onboarding_done && !inOnboarding) {
          router.replace('/(onboarding)/step1-body');
        } else if (p?.onboarding_done && (inAuth || inOnboarding)) {
          router.replace('/(tabs)');
        }
      });
      return;
    }

    if (!profile.onboarding_done && !inOnboarding) {
      router.replace('/(onboarding)/step1-body');
    } else if (profile.onboarding_done && (inAuth || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, profile]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaProvider>
        <ErrorBoundary>
        <StatusBar style="light" />
        <AuthGuard />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.background },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modals/barcode-scanner" options={{ presentation: 'fullScreenModal', title: 'Barcode scannen' }} />
          <Stack.Screen name="modals/food-search" options={{ presentation: 'modal', title: 'Lebensmittel suchen' }} />
          <Stack.Screen name="modals/meal-detail" options={{ presentation: 'modal', title: 'Mahlzeit hinzufügen' }} />
        </Stack>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
