import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCOUNT_PREFIX = 'studyconnect:onboarding:v1:';
const EMAIL_INDEX_PREFIX = 'studyconnect:onboarding-email:v1:';
const STATUSES = new Set(['pending', 'active', 'paused', 'completed']);
const ORIGINS = new Set(['email-signup', 'manual']);
const DRAFT_KEYS = new Set(['objetivo', 'nivel', 'horasSemana', 'ritmo', 'interesses', 'dificuldades']);
const RECORD_KEYS = new Set([
  'version', 'userId', 'email', 'origin', 'verified', 'status', 'step', 'part',
  'question', 'draft', 'profileSaved', 'selectedTrailId', 'completedAt',
]);

function normalizeId(value) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const id = String(value).trim();
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) ? id : null;
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function identity(user) {
  if (!user || typeof user !== 'object') return null;
  const userId = normalizeId(user.id);
  const email = normalizeEmail(user.email);
  return userId && email ? { userId, email } : null;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validDraftValue(key, value) {
  if (key === 'horasSemana') return typeof value === 'number' && Number.isFinite(value);
  if (key === 'interesses' || key === 'dificuldades') {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }
  return typeof value === 'string';
}

function sanitizedDraft(input) {
  if (!isPlainObject(input)) return null;
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!DRAFT_KEYS.has(key) || !validDraftValue(key, value)) continue;
    result[key] = Array.isArray(value) ? [...value] : value;
  }
  return result;
}

function isValidRecord(value) {
  if (!isPlainObject(value) || Object.keys(value).some((key) => !RECORD_KEYS.has(key))) return false;
  if (value.version !== 1 || normalizeId(value.userId) !== value.userId) return false;
  if (normalizeEmail(value.email) !== value.email) return false;
  if (!ORIGINS.has(value.origin) || typeof value.verified !== 'boolean' || !STATUSES.has(value.status)) return false;
  if (!Number.isInteger(value.step) || value.step < 0 || value.step > 5) return false;
  if (!Number.isInteger(value.part) || value.part < 0 || value.part > 3) return false;
  if (!Number.isInteger(value.question) || value.question < 0 || value.question > 5) return false;
  if (!isPlainObject(value.draft) || Object.keys(value.draft).some((key) => !DRAFT_KEYS.has(key) || !validDraftValue(key, value.draft[key]))) return false;
  if (typeof value.profileSaved !== 'boolean') return false;
  if (value.selectedTrailId !== null && normalizeId(value.selectedTrailId) !== value.selectedTrailId) return false;
  if (value.completedAt !== null && (typeof value.completedAt !== 'string' || Number.isNaN(Date.parse(value.completedAt)))) return false;
  if (value.status === 'completed' && (value.step !== 5 || value.completedAt === null)) return false;
  if (value.origin === 'manual' && value.status === 'pending') return false;
  if (value.origin === 'email-signup' && value.verified === false && value.status !== 'pending') return false;
  if (value.origin === 'email-signup' && value.verified === true && value.status === 'pending') return false;
  return true;
}

function parseRecord(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    const parsed = JSON.parse(raw);
    return isValidRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isEligible(record, user) {
  return record?.userId === user.userId
    && record.email === user.email
    && (record.origin === 'manual' || record.verified);
}

function initialRecord(user, origin) {
  return {
    version: 1,
    userId: user.userId,
    email: user.email,
    origin,
    verified: false,
    status: origin === 'manual' ? 'active' : 'pending',
    step: 0,
    part: 0,
    question: 0,
    draft: {},
    profileSaved: false,
    selectedTrailId: null,
    completedAt: null,
  };
}

function serialize(queues, key, operation) {
  const previous = queues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  queues.set(key, current);
  return current.finally(() => {
    if (queues.get(key) === current) queues.delete(key);
  });
}

/**
 * Store contract (all methods return promises):
 * recordSignup({ id, email }) creates a pending local email signup; markVerified(email)
 * activates only that signup; read({ id, email }) returns an eligible matching record or null;
 * update(user, patch) merges allowlisted progress fields; start(user) explicitly starts or
 * resumes a manual tour, including a matching pending email signup after authentication.
 * Unknown records and invalid identities return null. Storage I/O
 * errors reject so callers can show a retry action. No credentials are persisted.
 */
export function createOnboardingStore(storage) {
  if (!storage?.getItem || !storage?.setItem) throw new TypeError('Storage adapter must provide getItem and setItem.');
  const accountQueues = new Map();
  const emailQueues = new Map();
  const deletedAccounts = new Set();
  const accountKey = (userId) => `${ACCOUNT_PREFIX}${encodeURIComponent(userId)}`;
  const emailKey = (email) => `${EMAIL_INDEX_PREFIX}${encodeURIComponent(email)}`;
  const forAccount = (userId, operation) => serialize(accountQueues, userId, operation);
  const forEmail = (email, operation) => serialize(emailQueues, email, operation);
  const load = async (userId) => parseRecord(await storage.getItem(accountKey(userId)));
  const save = async (record) => {
    await storage.setItem(accountKey(record.userId), JSON.stringify(record));
    return record;
  };

  return {
    async recordSignup(dto) {
      const user = identity(dto);
      if (!user || deletedAccounts.has(user.userId)) return null;
      return forEmail(user.email, () => forAccount(user.userId, async () => {
        const raw = await storage.getItem(accountKey(user.userId));
        if (raw !== null) {
          const existing = parseRecord(raw);
          return existing?.userId === user.userId && existing.email === user.email && existing.origin === 'email-signup'
            ? existing
            : null;
        }
        const record = initialRecord(user, 'email-signup');
        // Index first: a failed record write leaves only an inert index, not an eligible record.
        await storage.setItem(emailKey(user.email), user.userId);
        return save(record);
      }));
    },

    async markVerified(emailInput) {
      const email = normalizeEmail(emailInput);
      if (!email) return null;
      return forEmail(email, async () => {
        const userId = normalizeId(await storage.getItem(emailKey(email)));
        if (!userId || deletedAccounts.has(userId)) return null;
        return forAccount(userId, async () => {
          const record = await load(userId);
          if (!record || record.userId !== userId || record.email !== email || record.origin !== 'email-signup') return null;
          if (record.verified) return record;
          return save({ ...record, verified: true, status: 'active' });
        });
      });
    },

    async read(userInput) {
      const user = identity(userInput);
      if (!user || deletedAccounts.has(user.userId)) return null;
      return forAccount(user.userId, async () => {
        const record = await load(user.userId);
        return isEligible(record, user) ? record : null;
      });
    },

    async update(userInput, patch) {
      const user = identity(userInput);
      if (!user || deletedAccounts.has(user.userId) || !isPlainObject(patch)) return null;
      return forAccount(user.userId, async () => {
        const record = await load(user.userId);
        if (!isEligible(record, user)) return null;
        if (record.status === 'completed') return record;

        const next = { ...record };
        for (const key of ['step', 'part', 'question']) {
          const limits = { step: 5, part: 3, question: 5 };
          if (Number.isInteger(patch[key]) && patch[key] >= 0 && patch[key] <= limits[key]) next[key] = patch[key];
        }
        if (isPlainObject(patch.draft)) next.draft = { ...record.draft, ...sanitizedDraft(patch.draft) };
        if (typeof patch.profileSaved === 'boolean') next.profileSaved = patch.profileSaved;
        if (patch.selectedTrailId === null) next.selectedTrailId = null;
        else if (normalizeId(patch.selectedTrailId)) next.selectedTrailId = normalizeId(patch.selectedTrailId);
        if (patch.status === 'active' || patch.status === 'paused') next.status = patch.status;
        if (patch.status === 'completed' && next.step === 5) next.status = 'completed';
        if (next.status === 'completed' && next.completedAt === null) {
          next.completedAt = typeof patch.completedAt === 'string' && !Number.isNaN(Date.parse(patch.completedAt))
            ? patch.completedAt
            : new Date().toISOString();
        }
        return save(next);
      });
    },

    async start(userInput) {
      const user = identity(userInput);
      if (!user || deletedAccounts.has(user.userId)) return null;
      return forAccount(user.userId, async () => {
        const raw = await storage.getItem(accountKey(user.userId));
        if (raw === null) return save(initialRecord(user, 'manual'));
        const record = parseRecord(raw);
        if (!record || record.userId !== user.userId || record.email !== user.email) return null;
        if (record.origin === 'email-signup' && !record.verified) return save(initialRecord(user, 'manual'));
        if (record.status === 'completed') {
          return save({ ...record, origin: 'manual', status: 'active', step: 0, part: 0, question: 0, draft: {}, selectedTrailId: null });
        }
        return record.status === 'active' ? record : save({ ...record, status: 'active' });
      });
    },

    async clear(userInput) {
      const user = identity(userInput);
      if (!user) return null;
      deletedAccounts.add(user.userId);
      return forEmail(user.email, () => forAccount(user.userId, async () => {
        if (typeof storage.removeItem !== 'function') {
          throw new TypeError('Storage adapter must provide removeItem to clear onboarding data.');
        }
        await storage.removeItem(accountKey(user.userId));
        const indexedUserId = normalizeId(await storage.getItem(emailKey(user.email)));
        if (indexedUserId === user.userId) await storage.removeItem(emailKey(user.email));
        return true;
      }));
    },
  };
}

export const onboardingStore = createOnboardingStore(AsyncStorage);
export default onboardingStore;
