import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getCurrentUser, login as loginRequest, verifyMfa as verifyMfaRequest } from '../services/authService';
import { ApiError, setAccessToken, setUnauthorizedHandler } from '../services/apiClient';
import { clearSession, readSession, saveSession } from '../services/sessionStorage';

const AuthContext = createContext(null);

function publicUser(data) {
  return {
    id: data.id,
    nome: data.nome,
    email: data.email,
    role: data.role || data.tipoUsuario,
    fotoUrl: data.fotoUrl ?? null,
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
  const [pendingMfaEmail, setPendingMfaEmail] = useState(null);
  const [isRestoring, setIsRestoring] = useState(true);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    setPendingMfaEmail(null);
    await clearSession();
  }, []);

  const finishAuthentication = useCallback(async (data) => {
    ensureStudent(data);

    const expiresIn = Number(data.expiresIn);
    const expiresAt = Date.now() + expiresIn * 1000;
    const nextUser = publicUser(data);
    const session = { token: data.accessToken, expiresAt, user: nextUser };

    setAccessToken(data.accessToken);
    await saveSession(session);
    setPendingMfaEmail(null);
    setUser(nextUser);
    return nextUser;
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
        await saveSession({ ...session, user: nextUser });
        setUser(nextUser);
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
      return { mfaRequired: true };
    }
    await finishAuthentication(data);
    return { mfaRequired: false };
  }, [finishAuthentication]);

  const verifyMfa = useCallback(async (code) => {
    if (!pendingMfaEmail) {
      throw new Error('A sessão de verificação expirou. Faça login novamente.');
    }
    const data = await verifyMfaRequest(pendingMfaEmail, code);
    return finishAuthentication(data);
  }, [finishAuthentication, pendingMfaEmail]);

  const cancelMfa = useCallback(() => setPendingMfaEmail(null), []);

  const updateUser = useCallback(async (changes) => {
    const session = await readSession();
    if (!session?.token || !session?.user) return null;
    const nextUser = publicUser({ ...session.user, ...changes });
    await saveSession({ ...session, user: nextUser });
    setUser(nextUser);
    return nextUser;
  }, []);

  const value = useMemo(() => ({
    user,
    isRestoring,
    pendingMfaEmail,
    signIn,
    verifyMfa,
    cancelMfa,
    logout,
    updateUser,
  }), [cancelMfa, isRestoring, logout, pendingMfaEmail, signIn, updateUser, user, verifyMfa]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
