import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getCurrentUser, googleLogin as googleLoginRequest, login as loginRequest, registerStudent as registerStudentRequest, verifyEmail as verifyEmailRequest, verifyMfa as verifyMfaRequest } from '../services/authService';
import { ApiError, setAccessToken, setUnauthorizedHandler } from '../services/apiClient';
import { clearGoogleSession } from '../services/googleSignInService';
import { clearSession, readSession, saveSession } from '../services/sessionStorage';
import { clearProfilePhoto } from '../services/profilePhotoStorage';
import { clearStudyModeData } from '../services/studyModeStorage';
import { clearRegistrationCompletion, readRegistrationCompletion, saveRegistrationCompletion } from '../services/registrationCompletionStorage';
import { onboardingStore } from '../onboarding/storage';
import { deleteOwnAccount, getAccountSecurity, requestAccountDeletionChallenge } from '../services/usuarioService';

const AuthContext = createContext(null);

function publicUser(data) {
  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    role: data.role || data.tipoUsuario,
    fotoUrl: data.fotoUrl ?? null,
    fotoLocalUri: data.fotoLocalUri ?? null,
  };
}

function ensureStudent(data) {
  const role = data?.role || data?.tipoUsuario;
  if (role !== 'ALUNO') {
    throw new ApiError('Este aplicativo é exclusivo para contas de aluno.', {
      status: 403,
      code: 'STUDENT_ONLY',
    });
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const authenticatedUserId = user?.id;
  const [pendingMfaEmail, setPendingMfaEmail] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isAuthTransitioning, setIsAuthTransitioning] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const [onboardingPending, setOnboardingPending] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingError, setOnboardingError] = useState('');
  const [pendingMfaOnboarding, setPendingMfaOnboarding] = useState(false);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    setPendingMfaEmail(null);
    setPendingMfaOnboarding(false);
    setOnboardingPending(false);
    setOnboardingStep(0);
    setOnboardingError('');
    await Promise.all([clearSession(), clearGoogleSession()]);
  }, []);

  const finishAuthentication = useCallback(async (data) => {
    ensureStudent(data);
    setIsAuthTransitioning(true);
    try {
      const expiresIn = Number(data.expiresIn);
      const expiresAt = Date.now() + expiresIn * 1000;
      const nextUser = publicUser(data);
      setAccessToken(data.accessToken);
      setAccountDeleted(false);
      setPendingMfaEmail(null);
      setUser(nextUser);
      setPendingMfaOnboarding(false);

      let record = null;
      let tourRequired = data.onboardingRequired === true;
      try {
        record = await onboardingStore.read(nextUser);
        if (tourRequired && !record) {
          await onboardingStore.recordSignup(nextUser);
          await onboardingStore.markVerified(nextUser.email);
          record = await onboardingStore.read(nextUser);
        }
        if (tourRequired && record?.origin === 'email-signup' && !record.verified) {
          record = await onboardingStore.markVerified(nextUser.email);
        }
        if (record?.status === 'paused') {
          record = await onboardingStore.update(nextUser, { status: 'active' });
        }
        if (record?.status === 'completed') tourRequired = false;
        else if (record?.status === 'active') tourRequired = true;
        setOnboardingStep(Number.isInteger(record?.step) ? Math.min(record.step, 2) : 0);
        setOnboardingError('');
      } catch (error) {
        setOnboardingError(error?.message || 'Não foi possível salvar o andamento da apresentação.');
      }
      setOnboardingPending(tourRequired);
      await saveSession({
        token: data.accessToken,
        expiresAt,
        user: nextUser,
        onboardingPending: tourRequired,
      });
      return nextUser;
    } finally {
      setIsAuthTransitioning(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const session = await readSession();
        if (!session?.token || !session?.expiresAt || !session?.user?.id) return;
        if (Date.now() >= session.expiresAt) {
          await clearSession();
          return;
        }

        setAccessToken(session.token);
        const freshUser = await getCurrentUser(session.user.id);
        ensureStudent(freshUser);

        if (!active) return;
        const nextUser = publicUser({ ...session.user, ...freshUser });
        setUser(nextUser);
        let tourRequired = false;
        try {
          let record = await onboardingStore.read(nextUser);
          if (record?.status === 'paused') {
            record = await onboardingStore.update(nextUser, { status: 'active' });
          }
          tourRequired = record?.status === 'active';
          setOnboardingStep(Number.isInteger(record?.step) ? Math.min(record.step, 2) : 0);
          setOnboardingError('');
        } catch (onboardingStorageError) {
          tourRequired = session.onboardingPending === true;
          setOnboardingError(onboardingStorageError?.message || 'Não foi possível recuperar a apresentação.');
        }
        setOnboardingPending(tourRequired);
        await saveSession({ ...session, user: nextUser, onboardingPending: tourRequired });
      } catch {
        setAccessToken(null);
        await clearSession();
      } finally {
        if (active) setIsRestoring(false);
      }
    }

    void restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let timeoutId;
    void readSession().then((session) => {
      if (!session?.expiresAt) return;
      const remaining = session.expiresAt - Date.now();
      if (remaining <= 0) {
        void logout();
        return;
      }
      timeoutId = setTimeout(() => void logout(), remaining);
    });

    return () => clearTimeout(timeoutId);
  }, [logout, user]);

  const signIn = useCallback(async (email, senha) => {
    const data = await loginRequest(email, senha);
    if (data?.mfaPendente === true) {
      setPendingMfaEmail(data.email || email);
      setPendingMfaOnboarding(data.onboardingRequired === true);
      return { mfaRequired: true };
    }
    await finishAuthentication(data);
    return { mfaRequired: false, onboardingRequired: data.onboardingRequired === true };
  }, [finishAuthentication]);

  const signInWithGoogle = useCallback(async (idToken) => {
    const data = await googleLoginRequest(idToken);
    if (data?.mfaPendente === true) {
      setPendingMfaEmail(data.email);
      setPendingMfaOnboarding(data.onboardingRequired === true);
      return { mfaRequired: true };
    }
    if (data?.mfaHabilitado === true) {
      throw new ApiError('Esta conta usa MFA. O servidor precisa iniciar o desafio antes de liberar o acesso pelo Google.', {
        status: 403,
        code: 'GOOGLE_MFA_REQUIRED',
      });
    }
    await finishAuthentication(data);
    return { mfaRequired: false, onboardingRequired: data.onboardingRequired === true };
  }, [finishAuthentication]);

  const verifyMfa = useCallback(async (code) => {
    if (!pendingMfaEmail) {
      throw new Error('A sessão de verificação expirou. Faça login novamente.');
    }
    const data = await verifyMfaRequest(pendingMfaEmail, code);
    await finishAuthentication({
      ...data,
      onboardingRequired: pendingMfaOnboarding || data.onboardingRequired === true,
    });
    return true;
  }, [finishAuthentication, pendingMfaEmail, pendingMfaOnboarding]);

  const cancelMfa = useCallback(() => {
    setPendingMfaEmail(null);
    setPendingMfaOnboarding(false);
  }, []);

  const rememberRegistration = useCallback(async ({ id, email, registrationToken }) => {
    await saveRegistrationCompletion(email, registrationToken);
    const record = await onboardingStore.recordSignup({ id, email });
    if (!record) throw new Error('Não foi possível salvar o estado deste cadastro neste dispositivo.');
  }, []);

  const register = useCallback(async (nome, email, senha) => {
    const response = await registerStudentRequest(nome, email, senha);
    await rememberRegistration(response);
    return response;
  }, [rememberRegistration]);

  const completeSignupVerification = useCallback(async (email, code) => {
    const registrationToken = await readRegistrationCompletion(email);
    if (!registrationToken) {
      const result = await verifyEmailRequest(email, code);
      try {
        await onboardingStore.markVerified(email);
      } catch (storageError) {
        setOnboardingError(storageError?.message || 'Não foi possível salvar o estado local do cadastro.');
      }
      return { verificationOnly: true, message: result?.message };
    }
    let data;
    try {
      data = await verifyEmailRequest(email, code, registrationToken);
    } catch (error) {
      if (error?.status !== 401) throw error;
      const result = await verifyEmailRequest(email, code);
      try {
        await onboardingStore.markVerified(email);
      } catch (storageError) {
        setOnboardingError(storageError?.message || 'Não foi possível salvar o estado local do cadastro.');
      }
      try {
        await clearRegistrationCompletion();
      } catch (storageError) {
        setOnboardingError(storageError?.message || 'Não foi possível limpar a confirmação temporária do cadastro.');
      }
      return { verificationOnly: true, message: result?.message };
    }
    try {
      await onboardingStore.markVerified(email);
    } catch (error) {
      setOnboardingError(error?.message || 'Não foi possível salvar a verificação local do cadastro.');
    }
    if (data?.mfaPendente === true) {
      setPendingMfaEmail(data.email || email);
      setPendingMfaOnboarding(data.onboardingRequired === true);
      await clearRegistrationCompletion();
      return { mfaRequired: true };
    }
    await finishAuthentication(data);
    await clearRegistrationCompletion();
    return { mfaRequired: false };
  }, [finishAuthentication]);

  const updateUser = useCallback(async (changes) => {
    const session = await readSession();
    if (!session?.token || !session?.user) return null;
    const nextUser = publicUser({ ...session.user, ...changes });
    await saveSession({ ...session, user: nextUser });
    setUser(nextUser);
    return nextUser;
  }, []);

  const loadAccountSecurity = useCallback(async () => getAccountSecurity(), []);

  const requestDeleteCode = useCallback(async (proof) => {
    if (!authenticatedUserId) throw new Error('Sua sessão expirou. Entre novamente.');
    return requestAccountDeletionChallenge(proof);
  }, [authenticatedUserId]);

  const deleteAccount = useCallback(async ({ senha, codigoMfa, googleIdToken }) => {
    if (!authenticatedUserId) throw new Error('Sua sessão expirou. Entre novamente.');
    await deleteOwnAccount(authenticatedUserId, { senha, codigoMfa, googleIdToken });
    setAccountDeleted(true);
    const cleanup = await Promise.allSettled([
      logout(),
      clearStudyModeData(authenticatedUserId),
      clearProfilePhoto(authenticatedUserId),
      onboardingStore.clear({ id: authenticatedUserId, email: user?.email }),
    ]);
    const failure = cleanup.find((result) => result.status === 'rejected');
    if (failure) {
      const error = new Error(`A conta foi excluída, mas houve uma falha ao limpar os dados locais: ${failure.reason?.message || 'tente reiniciar o aplicativo.'}`);
      error.code = 'ACCOUNT_DELETED_LOCAL_CLEANUP_FAILED';
      throw error;
    }
  }, [authenticatedUserId, logout, user?.email]);

  const updateTourStep = useCallback(async (step) => {
    if (!user) return;
    try {
      const record = await onboardingStore.update(user, { step });
      if (!record) throw new Error('Não foi possível salvar o andamento da apresentação.');
      setOnboardingStep(Math.min(step, 2));
      setOnboardingError('');
    } catch (error) {
      setOnboardingError(error?.message || 'Não foi possível salvar o andamento da apresentação.');
      throw error;
    }
  }, [user]);

  const completeTour = useCallback(async () => {
    if (!user) throw new Error('Sua sessão expirou. Entre novamente.');
    try {
      const record = await onboardingStore.update(user, { step: 5, status: 'completed' });
      if (record?.status !== 'completed') throw new Error('Não foi possível concluir e salvar a apresentação.');
      setOnboardingPending(false);
      setOnboardingStep(0);
      setOnboardingError('');
      const session = await readSession();
      if (session) await saveSession({ ...session, onboardingPending: false });
    } catch (error) {
      setOnboardingError(error?.message || 'Não foi possível concluir e salvar a apresentação.');
      throw error;
    }
  }, [user]);

  const pauseTour = useCallback(async () => {
    if (!user) throw new Error('Sua sessão expirou. Entre novamente.');
    try {
      const record = await onboardingStore.update(user, { status: 'paused' });
      if (!record) throw new Error('Não foi possível salvar o ponto em que a apresentação foi interrompida.');
      setOnboardingPending(false);
      const session = await readSession();
      if (session) await saveSession({ ...session, onboardingPending: true });
    } catch (error) {
      setOnboardingError(error?.message || 'Não foi possível salvar o ponto de interrupção.');
      throw error;
    }
  }, [user]);

  const retryOnboarding = useCallback(async () => {
    if (!user) return;
    let record = await onboardingStore.read(user);
    if (!record) {
      await onboardingStore.recordSignup(user);
      await onboardingStore.markVerified(user.email);
      record = await onboardingStore.read(user);
    }
    if (!record) throw new Error('Não foi possível restaurar o estado da apresentação.');
    if (record.status === 'paused') record = await onboardingStore.update(user, { status: 'active' });
    setOnboardingStep(Number.isInteger(record?.step) ? Math.min(record.step, 2) : 0);
    setOnboardingPending(record?.status === 'active');
    setOnboardingError('');
  }, [user]);

  const value = useMemo(() => ({
    user,
    isRestoring,
    isAuthTransitioning,
    onboardingPending,
    onboardingStep,
    onboardingError,
    pendingMfaEmail,
    accountDeleted,
    signIn,
    signInWithGoogle,
    register,
    completeSignupVerification,
    rememberRegistration,
    verifyMfa,
    cancelMfa,
    logout,
    updateUser,
    loadAccountSecurity,
    requestDeleteCode,
    deleteAccount,
    updateTourStep,
    completeTour,
    pauseTour,
    retryOnboarding,
  }), [
    accountDeleted, cancelMfa, completeSignupVerification, completeTour, deleteAccount, isAuthTransitioning, isRestoring,
    loadAccountSecurity, logout, onboardingError, onboardingPending, onboardingStep, pauseTour,
    pendingMfaEmail, register, rememberRegistration, requestDeleteCode, retryOnboarding, signIn,
    signInWithGoogle, updateTourStep, updateUser, user, verifyMfa,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
