import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import {
  desmatricular as desmatricularRequest,
  getMatriculasDoAluno,
  matricular as matricularRequest,
} from '../services/matriculaService';
import { acessarTrilhaPrivada as acessarTrilhaPrivadaRequest, getTrilhaById, getTrilhas } from '../services/trilhaService';

const TrilhasContext = createContext(null);

export function TrilhasProvider({ children }) {
  const { user } = useAuth();
  const alunoId = user?.id;
  const [trilhas, setTrilhas] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);
  const refreshPromiseRef = useRef(null);
  const mutationPromiseRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!alunoId) return;
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    setLoading(true);
    setError('');

    const request = (async () => {
      const [nextTrilhas, nextMatriculas] = await Promise.all([
        getTrilhas(),
        getMatriculasDoAluno(alunoId),
      ]);

      const activeMatriculas = Array.isArray(nextMatriculas)
        ? nextMatriculas.filter((matricula) => matricula?.ativo === true)
        : [];
      const knownIds = new Set(nextTrilhas.map((trilha) => Number(trilha.id)));
      const missingIds = activeMatriculas
        .map((matricula) => Number(matricula.trilhaId))
        .filter((id) => Number.isFinite(id) && !knownIds.has(id));

      const missingTrilhas = await Promise.all(
        missingIds.map((id) => getTrilhaById(id).catch(() => null)),
      );

      setTrilhas([...nextTrilhas, ...missingTrilhas.filter(Boolean)]);
      setMatriculas(activeMatriculas);
      loadedRef.current = true;
    })();

    refreshPromiseRef.current = request;
    try {
      await request;
    } catch (requestError) {
      setError(requestError?.message || 'Não foi possível carregar as trilhas.');
      throw requestError;
    } finally {
      refreshPromiseRef.current = null;
      setLoading(false);
    }
  }, [alunoId]);

  const ensureLoaded = useCallback(async () => {
    if (loadedRef.current) return;
    await refresh();
  }, [refresh]);

  const runMutation = useCallback(async (operation) => {
    if (mutationPromiseRef.current) return mutationPromiseRef.current;
    const request = operation();
    mutationPromiseRef.current = request;
    try {
      return await request;
    } finally {
      mutationPromiseRef.current = null;
    }
  }, []);

  const matricular = useCallback(async (trilhaId) => runMutation(async () => {
    await matricularRequest(alunoId, trilhaId);
    setMatriculas((current) => {
      if (current.some((item) => Number(item.trilhaId) === Number(trilhaId))) return current;
      return [...current, { alunoId, trilhaId: Number(trilhaId), ativo: true }];
    });
  }), [alunoId, runMutation]);

  const desmatricular = useCallback(async (trilhaId) => runMutation(async () => {
    await desmatricularRequest(alunoId, trilhaId);
    setMatriculas((current) => current.filter((item) => Number(item.trilhaId) !== Number(trilhaId)));
  }), [alunoId, runMutation]);

  const acessarTrilhaPrivada = useCallback(async (codigo) => runMutation(async () => {
    const response = await acessarTrilhaPrivadaRequest(codigo);
    await refresh();
    return response;
  }), [refresh, runMutation]);

  const setTrilha = useCallback((trilha) => {
    if (!trilha?.id) return;
    setTrilhas((current) => {
      const exists = current.some((item) => Number(item.id) === Number(trilha.id));
      return exists
        ? current.map((item) => Number(item.id) === Number(trilha.id) ? trilha : item)
        : [...current, trilha];
    });
  }, []);

  const matriculaIds = useMemo(
    () => new Set(matriculas.map((item) => Number(item.trilhaId))),
    [matriculas],
  );

  const minhasTrilhas = useMemo(
    () => trilhas.filter((trilha) => matriculaIds.has(Number(trilha.id))),
    [matriculaIds, trilhas],
  );

  const value = useMemo(() => ({
    trilhas,
    matriculas,
    minhasTrilhas,
    loading,
    error,
    ensureLoaded,
    refresh,
    matricular,
    desmatricular,
    acessarTrilhaPrivada,
    setTrilha,
    isMatriculado: (trilhaId) => matriculaIds.has(Number(trilhaId)),
  }), [acessarTrilhaPrivada, desmatricular, ensureLoaded, error, loading, matriculaIds, matricular, matriculas, minhasTrilhas, refresh, setTrilha, trilhas]);

  return <TrilhasContext.Provider value={value}>{children}</TrilhasContext.Provider>;
}

export function useTrilhas() {
  const context = useContext(TrilhasContext);
  if (!context) throw new Error('useTrilhas deve ser usado dentro de TrilhasProvider.');
  return context;
}
