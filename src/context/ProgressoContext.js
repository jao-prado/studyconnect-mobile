import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import {
  concluirAula as concluirAulaRequest,
  getAulasConcluidas,
  getProgressoTrilha,
} from '../services/progressoService';

const ProgressoContext = createContext(null);

function normalizeProgress(progress) {
  return {
    aulasConcluidas: Array.isArray(progress?.aulasConcluidas)
      ? progress.aulasConcluidas.map(Number).filter(Number.isFinite)
      : [],
    totalAulas: Number(progress?.totalAulas) || 0,
    percentual: Number(progress?.percentual) || 0,
  };
}

export function ProgressoProvider({ children }) {
  const { user } = useAuth();
  const alunoId = user?.id;
  const [concluidas, setConcluidas] = useState(() => new Set());
  const [porTrilha, setPorTrilha] = useState({});
  const allPromiseRef = useRef(null);
  const trailPromisesRef = useRef(new Map());
  const completionPromisesRef = useRef(new Map());

  const loadConcluidas = useCallback(async () => {
    if (!alunoId) return [];
    if (allPromiseRef.current) return allPromiseRef.current;

    const request = getAulasConcluidas(alunoId);
    allPromiseRef.current = request;
    try {
      const ids = await request;
      setConcluidas(new Set(ids));
      return ids;
    } finally {
      if (allPromiseRef.current === request) allPromiseRef.current = null;
    }
  }, [alunoId]);

  const loadProgressoTrilha = useCallback(async (trilhaId) => {
    if (!alunoId || !trilhaId) return normalizeProgress(null);
    const key = String(trilhaId);
    const pending = trailPromisesRef.current.get(key);
    if (pending) return pending;

    const request = getProgressoTrilha(trilhaId, alunoId);
    trailPromisesRef.current.set(key, request);
    try {
      const progress = normalizeProgress(await request);
      setPorTrilha((current) => ({ ...current, [key]: progress }));
      setConcluidas((current) => new Set([...current, ...progress.aulasConcluidas]));
      return progress;
    } finally {
      if (trailPromisesRef.current.get(key) === request) trailPromisesRef.current.delete(key);
    }
  }, [alunoId]);

  const concluirAula = useCallback(async (trilhaId, aulaId) => {
    const normalizedAulaId = Number(aulaId);
    if (concluidas.has(normalizedAulaId)) return;

    const key = String(normalizedAulaId);
    const pending = completionPromisesRef.current.get(key);
    if (pending) return pending;

    const request = (async () => {
      await concluirAulaRequest(alunoId, normalizedAulaId);
      setConcluidas((current) => new Set([...current, normalizedAulaId]));
      await loadProgressoTrilha(trilhaId);
    })();

    completionPromisesRef.current.set(key, request);
    try {
      await request;
    } finally {
      if (completionPromisesRef.current.get(key) === request) {
        completionPromisesRef.current.delete(key);
      }
    }
  }, [alunoId, concluidas, loadProgressoTrilha]);

  useEffect(() => {
    if (!alunoId) return;
    void loadConcluidas().catch(() => {});
  }, [alunoId, loadConcluidas]);

  const value = useMemo(() => ({
    concluidas,
    porTrilha,
    loadConcluidas,
    loadProgressoTrilha,
    concluirAula,
    isConcluida: (aulaId) => concluidas.has(Number(aulaId)),
  }), [concluidas, concluirAula, loadConcluidas, loadProgressoTrilha, porTrilha]);

  return <ProgressoContext.Provider value={value}>{children}</ProgressoContext.Provider>;
}

export function useProgresso() {
  const context = useContext(ProgressoContext);
  if (!context) throw new Error('useProgresso deve ser usado dentro de ProgressoProvider.');
  return context;
}
