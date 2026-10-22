import { Redirect } from 'expo-router';

import { useAuth } from '../context/AuthContext';
import { authenticatedLandingPath } from '../utils/authNavigation';

export default function IndexScreen() {
  const { user, onboardingPending } = useAuth();
  return <Redirect href={user ? authenticatedLandingPath(onboardingPending) : '/boas-vindas'} />;
}
