const assert = require('node:assert/strict');
const { authenticatedLandingPath, unauthenticatedLandingPath } = require('../src/utils/authNavigation');

assert.equal(authenticatedLandingPath(true), '/tour');
assert.equal(authenticatedLandingPath(false), '/home');
assert.equal(unauthenticatedLandingPath(false), '/login');
assert.equal(unauthenticatedLandingPath(true), '/boas-vindas');

console.log('Auth navigation: verified onboarding, returning user, and deleted account routes OK.');
