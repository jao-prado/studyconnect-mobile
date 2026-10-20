import { Redirect, Stack } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { ProgressoProvider } from '../../context/ProgressoContext';
import { TrilhasProvider } from '../../context/TrilhasContext';

export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;

  return (
    <TrilhasProvider>
      <ProgressoProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trilhas/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="trilhas/[trilhaId]/aulas/[aulaId]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </ProgressoProvider>
    </TrilhasProvider>
  );
}
