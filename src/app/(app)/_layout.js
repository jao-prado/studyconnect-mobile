import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { TrilhasProvider } from '../../context/TrilhasContext';

export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;

  return (
    <TrilhasProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="trilhas/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </TrilhasProvider>
  );
}
