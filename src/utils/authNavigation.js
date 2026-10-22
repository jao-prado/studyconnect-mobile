export function authenticatedLandingPath(onboardingPending) {
  return onboardingPending ? '/tour' : '/home';
}

export function unauthenticatedLandingPath(accountDeleted = false) {
  return accountDeleted ? '/boas-vindas' : '/login';
}
