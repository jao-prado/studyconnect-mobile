import { Redirect, Stack, usePathname } from 'expo-router';

import { useAuth } from '../../context/AuthContext';
import { authenticatedLandingPath } from '../../utils/authNavigation';

export default function AuthLayout() {
  const { user, onboardingPending } = useAuth();
  const pathname = usePathname();
  if (!user && pathname === '/tour') return <Redirect href="/boas-vindas" />;
  if (user && pathname === '/tour' && !onboardingPending) return <Redirect href={authenticatedLandingPath(false)} />;
  if (user && pathname !== '/tour') return <Redirect href={authenticatedLandingPath(onboardingPending)} />;

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
