export function enrollmentErrorMessage(error, action) {
  if (error?.status === 403) return 'Você não tem permissão para realizar esta operação.';
  if (error?.status === 404) return action === 'remove' ? 'Matrícula não encontrada.' : 'Trilha não encontrada.';
  if (error?.status === 409) return 'Você já está matriculado nesta trilha.';
  return error?.message || 'Não foi possível atualizar a matrícula.';
}

export function privateAccessErrorMessage(error) {
  if (error?.status === 401) return 'Código de acesso inválido.';
  if (error?.status === 404) return 'Nenhuma trilha foi encontrada com este código.';
  if (error?.status === 409) return 'Você já possui acesso a esta trilha.';
  if (error?.status === 403) return 'Sua conta não tem permissão para acessar esta trilha.';
  return error?.message || 'Não foi possível validar o código.';
}
