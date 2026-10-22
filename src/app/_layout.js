import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '../components/LoadingScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

function RootNavigator() {
  const { isRestoring, isAuthTransitioning } = useAuth();
  const [iconsLoaded, iconsError] = useFonts(Ionicons.font);
  if (isRestoring || isAuthTransitioning || (!iconsLoaded && !iconsError)) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
